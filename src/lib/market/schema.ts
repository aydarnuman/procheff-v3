import { z } from 'zod';

export type Source = 
  | "migros"
  | "a101"
  | "bim"
  | "sok"
  | "carrefour"
  | "hepsiburada"
  | "trendyol"
  | "ai"
  | "scraper"
  | "api"
  | 'TUIK' | 'WEB' | 'DB' | 'AI'; // Backward compat
export type BrandTier = 'premium' | 'standard' | 'economy';
export type PackagingType = 'bulk' | 'retail' | 'wholesale';

// Paketleme bilgisi
export interface PackagingInfo {
  size: number;              // Paket boyutu (5, 10, 18 gibi)
  unit: string;              // Paket birimi (kg, lt, adet)
  type: PackagingType;       // Paket tipi
  description?: string;      // "18 LT bidon", "5 kg çuval" gibi
}

// Gelişmiş MarketQuote - Brand ve packaging desteği
export interface MarketQuote {
  product_key: string;          // normalize edilmiş anahtar (örn: "tavuk-eti")
  raw_query: string;            // kullanıcı girdi metni
  unit: string;                 // kg | lt | adet
  unit_price: number;           // TL (normalize edilmiş birim fiyat)
  currency: 'TRY';
  market_key?: Source;          // 🔥 EKLENDİ (market identifier)
  stock_status?: "in_stock" | "out_of_stock" | "limited";
  brand?: string;               // Marka adı (Orkide, Komili, vb.)
  brandTier?: BrandTier;        // Marka segmenti
  packaging?: string | PackagingInfo;
  quantity?: number;
  asOf: string;                 // ISO tarih
  source: Source;
  sourceTrust?: number;         // 0-1 arası güvenilirlik
  meta?: Record<string, unknown>;   // link, mağaza vs.
}

// Güven skoru detay breakdown
export interface ConfidenceBreakdown {
  // Old (backward compatible)
  category: number;             // Ürün kategori tespiti güveni (0-1)
  variant: number;              // Varyant match güveni (0-1)
  marketPrice: number;          // Fiyat füzyon güveni (0-1)
  weighted: number;             // Final ağırlıklı skor (0-1)
  
  // New (UI tarafından zorunlu)
  sourceReliability?: number;   // Kaynak güvenilirliği (0-1)
  priceConsistency?: number;    // Fiyat tutarlılığı (0-1)
  dataCompleteness?: number;    // Veri tamlığı (0-1)
  freshness?: number;           // Veri güncelliği (0-1)
  explanation?: string;         // "Yüksek güven: 3 kaynak uyumlu" gibi
}

// Marka bazlı fiyat seçenekleri
export interface BrandPriceOption {
  brand: string;
  price: number;
  availability: 'in_stock' | 'limited' | 'out_of_stock';
  source: Source;
  packaging?: PackagingInfo;
  lastUpdated: string;
}

// Volatility/Değişkenlik analizi
export interface PriceVolatility {
  score: number;                // 0-1: volatilite skoru
  trend: 'rising' | 'falling' | 'stable';
  avgDailyChange: number;       // Ortalama günlük değişim (%)
  maxSpike: number;             // En büyük sıçrama (%)
  recommendation: string;       // "Şimdi alın" / "Bekleyin" gibi
}

// Gelişmiş MarketFusion
export interface MarketFusion {
  product_key: string;
  unit: string;
  price: number;                // füzyon sonucu
  conf: number;                 // 0-1 güven skoru (backward compatible)
  sources: MarketQuote[];       // katkıda bulunanlar
  
  // YENİ: Detaylı güven breakdown
  confidenceBreakdown?: ConfidenceBreakdown;
  
  // YENİ: Marka bazlı fiyatlar
  priceByBrand?: BrandPriceOption[];
  
  // YENİ: Volatilite bilgisi
  volatility?: PriceVolatility;
  
  forecast?: {                  // opsiyonel tahmin
    nextMonth: number;
    conf: number;
    method: 'exp_smoothing' | 'arima' | 'sarima';
    trend?: 'rising' | 'falling' | 'stable';
  };
  
  // COMPACT UI için ek meta bilgiler
  timestamp?: string;
  aiInsights?: string;
  averagePrice?: number;
  minPrice?: number;
  maxPrice?: number;
  priceRange?: number;
  currency?: 'TRY';
  
  meta?: {
    outliers_removed?: number;      // Filtrelenen aşırı fiyat sayısı
    packaging?: PackagingType;      // Dominant paketleme tipi
    brand_tier?: BrandTier;         // Dominant marka segmenti  
    provider_health?: string[];     // Aktif provider listesi
    cache_hit?: boolean;            // Cache'ten mi geldi
  };
}

// Zod şemaları
export const PriceRequestSchema = z.object({
  product: z.string().min(1, 'Ürün adı gerekli'),
  unit: z.string().optional(),
});

export const BulkRequestSchema = z.object({
  items: z.array(z.object({
    product: z.string().min(1),
    unit: z.string().optional(),
  })).min(1, 'En az 1 ürün gerekli'),
});

export type PriceRequest = z.infer<typeof PriceRequestSchema>;
export type BulkRequest = z.infer<typeof BulkRequestSchema>;
