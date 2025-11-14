/**
 * API Key Vault
 * Secure credential management for market APIs
 */

interface APICredentials {
  apiKey?: string;
  clientId?: string;
  clientSecret?: string;
  endpoint?: string;
}

interface VaultConfig {
  migros?: APICredentials;
  getir?: APICredentials;
  trendyol?: APICredentials;
  carrefour?: APICredentials;
  a101?: APICredentials;
  bim?: APICredentials;
}

class APIVault {
  private static instance: APIVault;
  private credentials: VaultConfig = {};
  
  private constructor() {
    this.loadFromEnv();
  }
  
  static getInstance(): APIVault {
    if (!APIVault.instance) {
      APIVault.instance = new APIVault();
    }
    return APIVault.instance;
  }
  
  private loadFromEnv(): void {
    // Load credentials from environment variables
    this.credentials = {
      migros: {
        clientId: process.env.MIGROS_CLIENT_ID,
        clientSecret: process.env.MIGROS_CLIENT_SECRET,
        endpoint: process.env.MIGROS_API_URL || 'https://api.migros.com.tr'
      },
      getir: {
        apiKey: process.env.GETIR_API_KEY,
        endpoint: process.env.GETIR_API_URL || 'https://api.getir.com'
      },
      trendyol: {
        apiKey: process.env.TRENDYOL_API_KEY,
        endpoint: process.env.TRENDYOL_API_URL || 'https://api.trendyol.com'
      },
      carrefour: {
        apiKey: process.env.CARREFOUR_API_KEY,
        endpoint: process.env.CARREFOUR_API_URL || 'https://api.carrefoursa.com'
      },
      a101: {
        apiKey: process.env.A101_API_KEY,
        endpoint: process.env.A101_API_URL || 'https://api.a101.com.tr'
      },
      bim: {
        apiKey: process.env.BIM_API_KEY,
        endpoint: process.env.BIM_API_URL || 'https://api.bim.com.tr'
      }
    };
  }
  
  getCredentials(market: keyof VaultConfig): APICredentials | null {
    const creds = this.credentials[market];
    
    // Check if any credential exists
    if (creds && (creds.apiKey || creds.clientId)) {
      return creds;
    }
    
    return null;
  }
  
  hasValidCredentials(market: keyof VaultConfig): boolean {
    const creds = this.credentials[market];
    
    if (!creds) return false;
    
    // Different markets have different auth requirements
    switch (market) {
      case 'migros':
        return !!(creds.clientId && creds.clientSecret);
      case 'getir':
      case 'trendyol':
      case 'carrefour':
      case 'a101':
      case 'bim':
        return !!creds.apiKey;
      default:
        return false;
    }
  }
  
  getAvailableMarkets(): string[] {
    return Object.keys(this.credentials).filter(market => 
      this.hasValidCredentials(market as keyof VaultConfig)
    );
  }
  
  // For testing purposes - allows setting credentials programmatically
  setCredentials(market: keyof VaultConfig, creds: APICredentials): void {
    this.credentials[market] = creds;
  }
}

export const apiVault = APIVault.getInstance();
