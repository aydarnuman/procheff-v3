/**
 * Base API Provider
 * Tüm market API'leri için ortak interface ve fonksiyonlar
 */

export interface MarketAPIConfig {
  name: string;
  baseUrl: string;
  apiKey?: string;
  clientId?: string;
  clientSecret?: string;
  timeout?: number;
}

export interface APIProduct {
  id: string;
  name: string;
  brand?: string;
  price: number;
  discountPrice?: number;
  unit: string;
  weight: number;
  weightUnit: 'kg' | 'g' | 'lt' | 'ml' | 'adet';
  barcode?: string;
  imageUrl?: string;
  inStock: boolean;
  lastUpdated: Date;
}

export interface APISearchParams {
  query: string;
  barcode?: string;
  category?: string;
  limit?: number;
  offset?: number;
}

export abstract class BaseAPIProvider {
  protected config: MarketAPIConfig;
  protected headers: Record<string, string> = {};
  
  constructor(config: MarketAPIConfig) {
    this.config = config;
    this.setupHeaders();
  }
  
  protected abstract setupHeaders(): void;
  protected abstract authenticate(): Promise<string>;
  
  abstract search(params: APISearchParams): Promise<APIProduct[]>;
  abstract getProductById(id: string): Promise<APIProduct | null>;
  abstract getProductByBarcode(barcode: string): Promise<APIProduct | null>;
  
  protected async fetchWithAuth(endpoint: string, options?: RequestInit): Promise<Response> {
    const url = `${this.config.baseUrl}${endpoint}`;
    
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...this.headers,
          ...options?.headers,
        },
        signal: AbortSignal.timeout(this.config.timeout || 10000)
      });
      
      if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }
      
      return response;
    } catch (error) {
      console.error(`[${this.config.name}] API Error:`, error);
      throw error;
    }
  }
  
  protected normalizeProduct(rawProduct: any): APIProduct {
    // Her API kendi normalize metodunu override eder
    throw new Error('normalizeProduct must be implemented');
  }
}
