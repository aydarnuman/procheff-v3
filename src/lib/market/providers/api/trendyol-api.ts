import { BaseAPIProvider, APIProduct, APISearchParams } from './base-api-provider';

/**
 * Trendyol Market API Provider
 * REST API with Bearer token authentication
 */
export class TrendyolAPIProvider extends BaseAPIProvider {
  private sessionToken: string | null = null;
  
  protected setupHeaders(): void {
    this.headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'X-Storefront-Id': 'market',
      'X-Application': 'web'
    };
  }
  
  protected async authenticate(): Promise<string> {
    if (this.sessionToken) {
      return this.sessionToken;
    }
    
    try {
      // Trendyol uses session-based auth for market API
      const response = await fetch(`${this.config.baseUrl}/auth/anonymous-session`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify({
          platform: 'web',
          channel: 'market'
        })
      });
      
      const data = await response.json();
      this.sessionToken = data.sessionToken;
      
      return this.sessionToken || '';
    } catch (error) {
      console.error('[Trendyol API] Session creation failed:', error);
      throw error;
    }
  }
  
  async search(params: APISearchParams): Promise<APIProduct[]> {
    const token = await this.authenticate();
    
    const payload = {
      searchTerm: params.query,
      categoryIds: params.category ? [params.category] : undefined,
      offset: params.offset || 0,
      limit: params.limit || 24,
      sortBy: 'PRICE_ASC'
    };
    
    const response = await this.fetchWithAuth('/market-search/products', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });
    
    const data = await response.json();
    return data.products.map((p: any) => this.normalizeProduct(p));
  }
  
  async getProductById(id: string): Promise<APIProduct | null> {
    const token = await this.authenticate();
    
    try {
      const response = await this.fetchWithAuth(`/market-product/detail/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const data = await response.json();
      return this.normalizeProduct(data.product);
    } catch (error) {
      return null;
    }
  }
  
  async getProductByBarcode(barcode: string): Promise<APIProduct | null> {
    // Trendyol doesn't expose barcode search, use general search
    const results = await this.search({ query: barcode });
    return results.find(p => p.barcode === barcode) || null;
  }
  
  protected normalizeProduct(rawProduct: any): APIProduct {
    const variant = rawProduct.variants?.[0] || rawProduct;
    
    return {
      id: rawProduct.id || rawProduct.productId,
      name: rawProduct.name,
      brand: rawProduct.brand?.name || this.extractBrandFromName(rawProduct.name),
      price: variant.price?.sellingPrice || 0,
      discountPrice: variant.price?.discountedPrice,
      unit: 'adet',
      weight: this.extractWeightFromAttributes(variant.attributes),
      weightUnit: this.extractWeightUnitFromAttributes(variant.attributes),
      barcode: variant.barcode,
      imageUrl: rawProduct.images?.[0],
      inStock: variant.stock?.isAvailable || false,
      lastUpdated: new Date()
    };
  }
  
  private extractBrandFromName(name: string): string | undefined {
    // Trendyol genelde ürün isminin başına marka koyar
    const parts = name.split(' ');
    if (parts.length > 2) {
      return parts[0];
    }
    return undefined;
  }
  
  private extractWeightFromAttributes(attributes: any[]): number {
    if (!attributes) return 1;
    
    const weightAttr = attributes.find(a => 
      a.name?.toLowerCase().includes('ağırlık') || 
      a.name?.toLowerCase().includes('gramaj') ||
      a.name?.toLowerCase().includes('miktar')
    );
    
    if (weightAttr?.value) {
      const match = weightAttr.value.match(/(\d+(?:\.\d+)?)/);
      return match ? parseFloat(match[1]) : 1;
    }
    
    return 1;
  }
  
  private extractWeightUnitFromAttributes(attributes: any[]): 'kg' | 'g' | 'lt' | 'ml' | 'adet' {
    if (!attributes) return 'adet';
    
    const weightAttr = attributes.find(a => 
      a.name?.toLowerCase().includes('ağırlık') || 
      a.name?.toLowerCase().includes('gramaj') ||
      a.name?.toLowerCase().includes('miktar')
    );
    
    if (weightAttr?.value) {
      const value = weightAttr.value.toLowerCase();
      if (value.includes('kg')) return 'kg';
      if (value.includes('g') || value.includes('gram')) return 'g';
      if (value.includes('lt') || value.includes('litre')) return 'lt';
      if (value.includes('ml')) return 'ml';
    }
    
    return 'adet';
  }
}
