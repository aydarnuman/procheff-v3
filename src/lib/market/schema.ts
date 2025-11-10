import { z } from 'zod';

export type Source = 'TUIK' | 'WEB' | 'DB' | 'AI';

export interface MarketQuote {
  product_key: string;          // normalize edilmiş anahtar (örn: "tavuk-eti")
  raw_query: string;            // kullanıcı girdi metni
  unit: 'kg' | 'lt' | 'adet' | string;
  unit_price: number;           // TL
  currency: 'TRY';
  asOf: string;                 // ISO tarih
  source: Source;
  meta?: Record<string, unknown>;   // link, mağaza vs.
}

export interface MarketFusion {
  product_key: string;
  unit: string;
  price: number;                // füzyon sonucu
  conf: number;                 // 0-1 güven skoru
  sources: MarketQuote[];       // katkıda bulunanlar
  forecast?: {                  // opsiyonel tahmin
    nextMonth: number;
    conf: number;
    method: 'exp_smoothing';
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
