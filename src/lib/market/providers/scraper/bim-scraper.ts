import { BaseScraper, ScraperProduct } from './base-scraper';

/**
 * BİM Web Scraper
 * BİM market ürün bilgilerini çeker
 */
export class BimScraper extends BaseScraper {
  constructor() {
    super({
      name: 'BİM',
      baseUrl: 'https://www.bim.com.tr'
    });
  }
  
  protected async waitForPageLoad(): Promise<void> {
    // BİM uses dynamic loading
    await Promise.race([
      this.page!.waitForSelector('.product-list', { timeout: 10000 }),
      this.page!.waitForSelector('.urunler', { timeout: 10000 }),
      this.page!.waitForSelector('.aktuel-urunler', { timeout: 10000 })
    ]).catch(() => {
      return this.page!.waitForLoadState('networkidle');
    });
  }
  
  async searchProduct(query: string): Promise<ScraperProduct[]> {
    // BİM doesn't have a search feature, we need to browse categories
    // First, let's try to find products in common categories
    const categories = [
      '/kategoriler/sut-kahvaltilik',
      '/kategoriler/et-balik-tavuk',
      '/kategoriler/meyve-sebze',
      '/kategoriler/gida',
      '/kategoriler/icecek',
      '/kategoriler/temizlik'
    ];
    
    const allProducts: ScraperProduct[] = [];
    
    for (const category of categories) {
      try {
        await this.navigateWithRetry(`${this.config.baseUrl}${category}`);
        
        // Extract products from category page
        const products = await this.extractProductsFromPage();
        
        // Filter products that match the query
        const matchingProducts = products.filter(p => 
          p.name.toLowerCase().includes(query.toLowerCase())
        );
        
        allProducts.push(...matchingProducts);
        
        if (allProducts.length >= 10) break; // Enough results
      } catch (error) {
        console.warn(`[BİM] Error in category ${category}:`, error);
      }
    }
    
    return allProducts.slice(0, 20);
  }
  
  async getProductByUrl(url: string): Promise<ScraperProduct | null> {
    await this.navigateWithRetry(url);
    
    // BİM shows products in modals or inline, not separate pages
    // Extract from current view
    const products = await this.extractProductsFromPage();
    return products[0] || null;
  }
  
  private async extractProductsFromPage(): Promise<ScraperProduct[]> {
    // Wait for products to be visible
    await this.page!.waitForSelector('.product, .urun, .aktuel-urun', { timeout: 5000 }).catch(() => {});
    
    const products = await this.page!.evaluate(() => {
      const productSelectors = ['.product', '.urun', '.aktuel-urun'];
      const results: any[] = [];
      
      for (const selector of productSelectors) {
        const elements = document.querySelectorAll(selector);
        
        elements.forEach((el) => {
          // BİM has different layouts, try multiple selectors
          const name = el.querySelector('.title, .baslik, .urun-adi, h3, h4')?.textContent?.trim() ||
                      el.querySelector('img')?.getAttribute('alt') || '';
          
          const priceText = el.querySelector('.price, .fiyat, .urun-fiyat')?.textContent?.trim() || 
                          el.querySelector('.aktuel-fiyat')?.textContent?.trim() || '';
          
          const image = el.querySelector('img')?.getAttribute('src') || 
                       el.querySelector('img')?.getAttribute('data-src');
          
          const detailText = el.querySelector('.detail, .detay, .aciklama')?.textContent?.trim() || '';
          
          if (name && priceText) {
            results.push({
              name: name,
              price: priceText,
              imageUrl: image,
              productUrl: window.location.href,
              inStock: true, // BİM only shows available products
              detail: detailText
            });
          }
        });
      }
      
      return results;
    });
    
    return Promise.all(products.map(p => this.normalizeProduct(p)));
  }
  
  private async normalizeProduct(rawProduct: any): Promise<ScraperProduct> {
    const fullText = rawProduct.name + ' ' + (rawProduct.detail || '');
    const { weight, unit } = this.extractWeight(fullText);
    const brand = this.extractBrand(rawProduct.name);

    return {
      name: rawProduct.name,
      brand,
      price: this.extractPrice(rawProduct.price),
      discountPrice: undefined, // BİM usually doesn't show old prices
      unit: unit === 'adet' ? 'adet' : `${weight} ${unit}`,
      weight,
      weightUnit: unit,
      imageUrl: rawProduct.imageUrl ? this.fixImageUrl(rawProduct.imageUrl) : undefined,
      productUrl: rawProduct.productUrl,
      inStock: rawProduct.inStock,
      marketName: this.config.name,
      scrapedAt: new Date()
    };
  }
  
  private fixImageUrl(url: string): string {
    if (url.startsWith('http')) return url;
    if (url.startsWith('//')) return `https:${url}`;
    if (url.startsWith('/')) return `${this.config.baseUrl}${url}`;
    return url;
  }
  
  private extractBrand(productName: string): string | undefined {
    // BİM çoğunlukla kendi markalarını satar
    const ownBrands = ['Dost', 'Premium', 'Bio', 'Fresh'];
    
    for (const brand of ownBrands) {
      if (productName.includes(brand)) {
        return brand;
      }
    }
    
    // Bilinen markalar
    const knownBrands = [
      'Ülker', 'Eti', 'Nestle', 'Algida', 'Coca Cola', 'Pepsi',
      'Fairy', 'Domestos', 'Persil', 'Ariel', 'Finish'
    ];
    
    for (const brand of knownBrands) {
      if (productName.toLowerCase().includes(brand.toLowerCase())) {
        return brand;
      }
    }
    
    return undefined;
  }
}
