import { BaseAPIProvider, APIProduct, APISearchParams } from './base-api-provider';

/**
 * Getir API Provider
 * REST API with API Key authentication
 */
export class GetirAPIProvider extends BaseAPIProvider {
  protected setupHeaders(): void {
    this.headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'X-API-Key': this.config.apiKey || '',
      'X-Client-Version': '1.0.0'
    };
  }
  
  protected async authenticate(): Promise<string> {
    // Getir uses API key authentication, no separate auth step needed
    if (!this.config.apiKey) {
      throw new Error('Getir API key is required');
    }
    return this.config.apiKey;
  }
  
  async search(params: APISearchParams): Promise<APIProduct[]> {
    const queryParams = new URLSearchParams({
      query: params.query,
      page_size: String(params.limit || 20),
      page: String((params.offset || 0) / (params.limit || 20) + 1)
    });
    
    if (params.category) {
      queryParams.append('category_slug', params.category);
    }
    
    const response = await this.fetchWithAuth(`/products/search?${queryParams}`);
    const data = await response.json();
    
    return data.data.products.map((p: any) => this.normalizeProduct(p));
  }
  
  async getProductById(id: string): Promise<APIProduct | null> {
    try {
      const response = await this.fetchWithAuth(`/products/${id}`);
      const data = await response.json();
      return this.normalizeProduct(data.data);
    } catch (error) {
      return null;
    }
  }
  
  async getProductByBarcode(barcode: string): Promise<APIProduct | null> {
    // Getir doesn't have barcode endpoint, search by barcode
    const results = await this.search({ query: barcode });
    return results.find(p => p.barcode === barcode) || null;
  }
  
  protected normalizeProduct(rawProduct: any): APIProduct {
    return {
      id: rawProduct.id,
      name: rawProduct.name,
      brand: rawProduct.brand,
      price: rawProduct.price / 100, // Getir uses cents
      discountPrice: rawProduct.discounted_price ? rawProduct.discounted_price / 100 : undefined,
      unit: this.parseUnit(rawProduct.unit_info),
      weight: this.parseWeight(rawProduct.unit_info),
      weightUnit: this.parseWeightUnit(rawProduct.unit_info),
      barcode: rawProduct.barcode,
      imageUrl: rawProduct.image_url,
      inStock: rawProduct.is_available && rawProduct.stock > 0,
      lastUpdated: new Date()
    };
  }
  
  private parseUnit(unitInfo: string): string {
    // "1 kg", "500 g x 2", "6 x 200 ml" gibi formatları parse et
    if (unitInfo.includes('x')) {
      return 'paket';
    }
    return 'adet';
  }
  
  private parseWeight(unitInfo: string): number {
    const match = unitInfo.match(/(\d+(?:\.\d+)?)\s*(kg|g|lt|ml|l)/i);
    if (match) {
      let weight = parseFloat(match[1]);
      const unit = match[2].toLowerCase();
      
      // Çoklu paketlerde toplam ağırlığı hesapla
      const multiMatch = unitInfo.match(/(\d+)\s*x\s*(\d+(?:\.\d+)?)/i);
      if (multiMatch) {
        weight = parseFloat(multiMatch[1]) * parseFloat(multiMatch[2]);
      }
      
      return weight;
    }
    return 1;
  }
  
  private parseWeightUnit(unitInfo: string): 'kg' | 'g' | 'lt' | 'ml' | 'adet' {
    const match = unitInfo.match(/(kg|g|lt|ml|l)/i);
    if (match) {
      const unit = match[1].toLowerCase();
      if (unit === 'l') return 'lt';
      return unit as any;
    }
    return 'adet';
  }
}
