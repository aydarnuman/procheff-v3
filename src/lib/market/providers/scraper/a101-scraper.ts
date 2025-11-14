import { BaseScraper, ScraperProduct } from './base-scraper';

/**
 * A101 Web Scraper
 * Playwright ile A101 market ürün bilgilerini çeker
 */
export class A101Scraper extends BaseScraper {
  constructor() {
    super({
      name: 'A101',
      baseUrl: 'https://www.a101.com.tr'
    });
  }
  
  protected async waitForPageLoad(): Promise<void> {
    // A101 specific wait conditions
    await Promise.race([
      this.page!.waitForSelector('.product-card', { timeout: 10000 }),
      this.page!.waitForSelector('.search-results', { timeout: 10000 }),
      this.page!.waitForSelector('.product-detail', { timeout: 10000 })
    ]).catch(() => {
      // Fallback: wait for network idle
      return this.page!.waitForLoadState('networkidle');
    });
  }
  
  async searchProduct(query: string): Promise<ScraperProduct[]> {
    const searchUrl = `${this.config.baseUrl}/arama/?search_text=${encodeURIComponent(query)}`;
    await this.navigateWithRetry(searchUrl);
    
    // Accept cookies if popup appears
    await this.page!.locator('button:has-text("Kabul Et")').click().catch(() => {});
    
    // Wait for products to load
    await this.page!.waitForSelector('.products-list', { timeout: 10000 });
    
    // Extract product data
    const products = await this.page!.evaluate(() => {
      const productElements = document.querySelectorAll('.product-card');
      const results: any[] = [];
      
      productElements.forEach((el) => {
        const nameEl = el.querySelector('.product-name');
        const priceEl = el.querySelector('.current-price');
        const oldPriceEl = el.querySelector('.old-price');
        const imageEl = el.querySelector('.product-image img');
        const linkEl = el.querySelector('a');
        const stockEl = el.querySelector('.out-of-stock');
        
        if (nameEl && priceEl) {
          results.push({
            name: nameEl.textContent?.trim() || '',
            price: priceEl.textContent?.trim() || '0',
            discountPrice: oldPriceEl?.textContent?.trim(),
            imageUrl: imageEl?.getAttribute('src') || imageEl?.getAttribute('data-src'),
            productUrl: linkEl?.getAttribute('href') || '',
            inStock: !stockEl
          });
        }
      });
      
      return results;
    });
    
    // Process and normalize products
    const normalized = await Promise.all(
      products.slice(0, 20).map(p => this.normalizeProduct(p))
    );
    return normalized;
  }
  
  async getProductByUrl(url: string): Promise<ScraperProduct | null> {
    await this.navigateWithRetry(url);
    
    // Accept cookies if needed
    await this.page!.locator('button:has-text("Kabul Et")').click().catch(() => {});
    
    // Wait for product detail
    await this.page!.waitForSelector('.product-detail-container', { timeout: 10000 });
    
    const productData = await this.page!.evaluate(() => {
      const container = document.querySelector('.product-detail-container');
      if (!container) return null;
      
      const name = container.querySelector('.product-name')?.textContent?.trim() || '';
      const price = container.querySelector('.product-price .current')?.textContent?.trim() || '0';
      const oldPrice = container.querySelector('.product-price .old')?.textContent?.trim();
      const image = container.querySelector('.product-image img')?.getAttribute('src');
      const stockButton = container.querySelector('.add-to-basket-button');
      const specs = container.querySelector('.product-features')?.textContent || '';
      
      return {
        name,
        price,
        discountPrice: oldPrice,
        imageUrl: image,
        productUrl: window.location.href,
        inStock: stockButton && !stockButton.classList.contains('disabled'),
        specs
      };
    });
    
    if (!productData) return null;
    
    return await this.normalizeProduct(productData);
  }
  
  private async normalizeProduct(rawProduct: any): Promise<ScraperProduct> {
    const { weight, unit } = this.extractWeight(rawProduct.name + ' ' + (rawProduct.specs || ''));
    const brand = this.extractBrand(rawProduct.name);

    return {
      name: rawProduct.name,
      brand,
      price: this.extractPrice(rawProduct.price),
      discountPrice: rawProduct.discountPrice ? this.extractPrice(rawProduct.discountPrice) : undefined,
      unit: unit === 'adet' ? 'adet' : `${weight} ${unit}`,
      weight,
      weightUnit: unit,
      imageUrl: rawProduct.imageUrl,
      productUrl: rawProduct.productUrl.startsWith('http') 
        ? rawProduct.productUrl 
        : `${this.config.baseUrl}${rawProduct.productUrl}`,
      inStock: rawProduct.inStock,
      marketName: this.config.name,
      scrapedAt: new Date()
    };
  }
  
  private extractBrand(productName: string): string | undefined {
    // A101 genelde marka ismini başa koyar
    const brandPatterns = [
      'Ülker', 'Duru', 'Tariş', 'Yayla', 'Sezer', 'Filiz', 'Pınar', 
      'Sütaş', 'İçim', 'Danone', 'Activia', 'Beypiliç', 'Banvit',
      'Knorr', 'Calvé', 'Hellmann', 'Algida', 'Magnum'
    ];
    
    for (const brand of brandPatterns) {
      if (productName.toLowerCase().includes(brand.toLowerCase())) {
        return brand;
      }
    }
    
    // İlk kelimeyi marka olarak dene
    const firstWord = productName.split(' ')[0];
    if (firstWord.length > 3 && firstWord[0] === firstWord[0].toUpperCase()) {
      return firstWord;
    }
    
    return undefined;
  }
}
