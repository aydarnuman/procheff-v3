import { BaseAPIProvider, APIProduct, APISearchParams } from './base-api-provider';

/**
 * Migros API Provider
 * OAuth 2.0 authentication
 */
export class MigrosAPIProvider extends BaseAPIProvider {
  private accessToken: string | null = null;
  private tokenExpiry: Date | null = null;
  
  protected setupHeaders(): void {
    this.headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'X-Client-Id': this.config.clientId || '',
    };
  }
  
  protected async authenticate(): Promise<string> {
    // Token hala geçerliyse mevcut token'ı kullan
    if (this.accessToken && this.tokenExpiry && this.tokenExpiry > new Date()) {
      return this.accessToken;
    }
    
    try {
      const response = await fetch(`${this.config.baseUrl}/oauth/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${Buffer.from(`${this.config.clientId}:${this.config.clientSecret}`).toString('base64')}`
        },
        body: new URLSearchParams({
          grant_type: 'client_credentials',
          scope: 'product.read price.read'
        })
      });
      
      const data = await response.json();
      this.accessToken = data.access_token;
      this.tokenExpiry = new Date(Date.now() + (data.expires_in * 1000));
      
      return this.accessToken || '';
    } catch (error) {
      console.error('[Migros API] Authentication failed:', error);
      throw error;
    }
  }
  
  async search(params: APISearchParams): Promise<APIProduct[]> {
    const token = await this.authenticate();
    
    const queryParams = new URLSearchParams({
      q: params.query,
      limit: String(params.limit || 20),
      offset: String(params.offset || 0)
    });
    
    if (params.category) {
      queryParams.append('category', params.category);
    }
    
    const response = await this.fetchWithAuth(`/api/v2/products/search?${queryParams}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    const data = await response.json();
    return data.products.map((p: any) => this.normalizeProduct(p));
  }
  
  async getProductById(id: string): Promise<APIProduct | null> {
    const token = await this.authenticate();
    
    try {
      const response = await this.fetchWithAuth(`/api/v2/products/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const data = await response.json();
      return this.normalizeProduct(data);
    } catch (error) {
      return null;
    }
  }
  
  async getProductByBarcode(barcode: string): Promise<APIProduct | null> {
    const token = await this.authenticate();
    
    try {
      const response = await this.fetchWithAuth(`/api/v2/products/barcode/${barcode}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const data = await response.json();
      return this.normalizeProduct(data);
    } catch (error) {
      return null;
    }
  }
  
  protected normalizeProduct(rawProduct: any): APIProduct {
    // Migros API response'unu normalize et
    return {
      id: rawProduct.sku || rawProduct.id,
      name: rawProduct.name,
      brand: rawProduct.brand?.name,
      price: rawProduct.price?.regular || 0,
      discountPrice: rawProduct.price?.discounted,
      unit: rawProduct.unit || 'adet',
      weight: this.extractWeight(rawProduct),
      weightUnit: this.extractWeightUnit(rawProduct),
      barcode: rawProduct.barcode,
      imageUrl: rawProduct.images?.[0]?.url,
      inStock: rawProduct.availability?.inStock || false,
      lastUpdated: new Date(rawProduct.updatedAt || Date.now())
    };
  }
  
  private extractWeight(product: any): number {
    // "1 kg", "500 g", "1.5 lt" gibi formatları parse et
    const weightStr = product.weight || product.size || '';
    const match = weightStr.match(/(\d+(?:\.\d+)?)\s*(kg|g|lt|ml)?/i);
    
    if (match) {
      return parseFloat(match[1]);
    }
    
    return 1; // Default 1 adet
  }
  
  private extractWeightUnit(product: any): 'kg' | 'g' | 'lt' | 'ml' | 'adet' {
    const weightStr = product.weight || product.size || '';
    const match = weightStr.match(/(\d+(?:\.\d+)?)\s*(kg|g|lt|ml)?/i);
    
    if (match && match[2]) {
      return match[2].toLowerCase() as any;
    }
    
    return 'adet';
  }
}
