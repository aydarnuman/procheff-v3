import { BaseScraper, ScraperProduct } from './base-scraper';

/**
 * CarrefourSA Web Scraper
 * CarrefourSA market ürün bilgilerini çeker
 */
export class CarrefourScraper extends BaseScraper {
  constructor() {
    super({
      name: 'CarrefourSA',
      baseUrl: 'https://www.carrefoursa.com'
    });
  }
  
  protected async waitForPageLoad(): Promise<void> {
    await Promise.race([
      this.page!.waitForSelector('.product-list-container', { timeout: 10000 }),
      this.page!.waitForSelector('.product-item', { timeout: 10000 }),
      this.page!.waitForSelector('.search-page', { timeout: 10000 })
    ]).catch(() => {
      return this.page!.waitForLoadState('networkidle');
    });
  }
  
  async searchProduct(query: string): Promise<ScraperProduct[]> {
    const searchUrl = `${this.config.baseUrl}/arama?q=${encodeURIComponent(query)}`;
    await this.navigateWithRetry(searchUrl);
    
    // Handle cookie consent
    await this.page!.locator('#onetrust-accept-btn-handler').click().catch(() => {});
    
    // Wait for products
    await this.page!.waitForSelector('.product-listing', { timeout: 10000 });
    
    // Scroll to load more products (lazy loading)
    await this.autoScroll();
    
    // Extract products
    const products = await this.page!.evaluate(() => {
      const productElements = document.querySelectorAll('.product-listing .product-item');
      const results: any[] = [];
      
      productElements.forEach((el) => {
        const linkEl = el.querySelector('a.product-link');
        const nameEl = el.querySelector('.item-name');
        const brandEl = el.querySelector('.item-brand');
        const priceEl = el.querySelector('.item-price');
        const oldPriceEl = el.querySelector('.item-old-price');
        const imageEl = el.querySelector('.product-image img');
        const unitEl = el.querySelector('.birim-fiyat');
        const stockEl = el.querySelector('.out-of-stock, .stokta-yok');
        
        if (nameEl && priceEl) {
          results.push({
            name: nameEl.textContent?.trim() || '',
            brand: brandEl?.textContent?.trim(),
            price: priceEl.textContent?.trim() || '0',
            discountPrice: oldPriceEl?.textContent?.trim(),
            unit: unitEl?.textContent?.trim() || '',
            imageUrl: imageEl?.getAttribute('src') || imageEl?.getAttribute('data-src'),
            productUrl: linkEl?.getAttribute('href') || '',
            inStock: !stockEl
          });
        }
      });
      
      return results;
    });
    
    const normalized = await Promise.all(
      products.slice(0, 20).map(p => this.normalizeProduct(p))
    );
    return normalized;
  }
  
  async getProductByUrl(url: string): Promise<ScraperProduct | null> {
    await this.navigateWithRetry(url);
    
    // Cookie consent
    await this.page!.locator('#onetrust-accept-btn-handler').click().catch(() => {});
    
    // Wait for product detail
    await this.page!.waitForSelector('.product-detail', { timeout: 10000 });
    
    const productData = await this.page!.evaluate(() => {
      const container = document.querySelector('.product-detail');
      if (!container) return null;
      
      const name = container.querySelector('.product-name h1')?.textContent?.trim() || '';
      const brand = container.querySelector('.product-brand')?.textContent?.trim();
      const price = container.querySelector('.product-price-new')?.textContent?.trim() || 
                   container.querySelector('.product-price')?.textContent?.trim() || '0';
      const oldPrice = container.querySelector('.product-price-old')?.textContent?.trim();
      const image = container.querySelector('.product-image-main img')?.getAttribute('src');
      const unit = container.querySelector('.price-unit')?.textContent?.trim() || '';
      const stockStatus = container.querySelector('.add-to-cart-button');
      
      // Ürün özellikleri
      const features: string[] = [];
      container.querySelectorAll('.product-feature-item').forEach((el) => {
        features.push(el.textContent?.trim() || '');
      });
      
      return {
        name,
        brand,
        price,
        discountPrice: oldPrice,
        unit,
        imageUrl: image,
        productUrl: window.location.href,
        inStock: stockStatus && !stockStatus.classList.contains('disabled'),
        features: features.join(' ')
      };
    });
    
    if (!productData) return null;
    
    return await this.normalizeProduct(productData);
  }
  
  private async autoScroll(): Promise<void> {
    await this.page!.evaluate(async () => {
      await new Promise<void>((resolve) => {
        let totalHeight = 0;
        const distance = 100;
        const timer = setInterval(() => {
          const scrollHeight = document.body.scrollHeight;
          window.scrollBy(0, distance);
          totalHeight += distance;
          
          if (totalHeight >= scrollHeight) {
            clearInterval(timer);
            resolve();
          }
        }, 100);
        
        // Maximum 5 seconds of scrolling
        setTimeout(() => {
          clearInterval(timer);
          resolve();
        }, 5000);
      });
    });
  }
  
  private async normalizeProduct(rawProduct: any): Promise<ScraperProduct> {
    const fullText = rawProduct.name + ' ' + (rawProduct.unit || '') + ' ' + (rawProduct.features || '');
    const { weight, unit } = this.extractWeight(fullText);
    const brand = rawProduct.brand || this.extractBrand(rawProduct.name);

    return {
      name: rawProduct.name,
      brand,
      price: this.extractPrice(rawProduct.price),
      discountPrice: rawProduct.discountPrice ? this.extractPrice(rawProduct.discountPrice) : undefined,
      unit: unit === 'adet' ? 'adet' : `${weight} ${unit}`,
      weight,
      weightUnit: unit,
      imageUrl: this.fixImageUrl(rawProduct.imageUrl),
      productUrl: rawProduct.productUrl.startsWith('http') 
        ? rawProduct.productUrl 
        : `${this.config.baseUrl}${rawProduct.productUrl}`,
      inStock: rawProduct.inStock,
      marketName: this.config.name,
      scrapedAt: new Date()
    };
  }
  
  private fixImageUrl(url: string | undefined): string | undefined {
    if (!url) return undefined;
    if (url.startsWith('http')) return url;
    if (url.startsWith('//')) return `https:${url}`;
    if (url.startsWith('/')) return `${this.config.baseUrl}${url}`;
    return url;
  }
  
  private extractBrand(productName: string): string | undefined {
    // CarrefourSA brands
    const carrefourBrands = ['Carrefour', 'Selection', 'Bio', 'Eco Planet'];
    
    for (const brand of carrefourBrands) {
      if (productName.includes(brand)) {
        return brand;
      }
    }
    
    // Common brands
    const commonBrands = [
      'Ülker', 'Eti', 'Nestle', 'Pınar', 'Sütaş', 'İçim', 'Danone',
      'Coca Cola', 'Pepsi', 'Fanta', 'Sprite', 'Lipton', 'Nescafe',
      'Knorr', 'Calvé', 'Magnum', 'Algida', 'Carte d\'Or',
      'Fairy', 'Ariel', 'Persil', 'Finish', 'Domestos'
    ];
    
    for (const brand of commonBrands) {
      if (productName.toLowerCase().includes(brand.toLowerCase())) {
        return brand;
      }
    }
    
    return undefined;
  }
}
