# ProCheff API Validation Standard

## Neden
- Tüm REST/RPC endpoint'leri güvenli giriş verisiyle çalışır.
- UI → API → DB hattında tip zinciri kırılmaz.
- Hatalar tek formatta döner, loglanır ve izlenir.

## Kurallar
1. **Her** POST/PUT/PATCH isteği `validateRequest(req, schema)` ile doğrulanır.
2. GET/DELETE isteklerinde query parametreleri Zod ile parse edilir.
3. Validation hataları `400` döner ve `details` alanı Zod issues listesini içerir.
4. UI katmanı `components/system/ErrorBoundary` ile global olarak korunur.
5. Şema dosyaları `src/lib/validation/*` altında tutulur, ilgili endpoint sadece kendi şemasını import eder.

## Örnek
```ts
import { validateRequest } from "@/lib/utils/validate";
import { MarketFetchPriceSchema } from "@/lib/validation/market-fetch-price";

export async function POST(req: NextRequest) {
  try {
    const data = await validateRequest(req, MarketFetchPriceSchema);
    // ...
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "validation_error", details: error.errors },
        { status: 400 }
      );
    }
    throw error;
  }
}
```

## Test
```
npm run test -- validateRequest
npm run build
```

Bu dosya, yeni endpoint eklenirken uyulması gereken minimum güvenlik standardını tanımlar.

