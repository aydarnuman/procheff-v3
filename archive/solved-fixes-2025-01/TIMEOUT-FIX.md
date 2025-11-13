# ⏱️ İhale Worker Timeout Fix

## Sorun
İhale listesi çekilirken timeout hatası:
```
İhale listesi alınamadı: This operation was aborted
```

## Neden Oldu?
- Worker 9 sayfa ihale çekiyordu (~40 saniye)
- Ana app timeout'u **30 saniye**ydi
- İhaleler yüklenmeden connection kapanıyordu

## Çözüm
Timeout **120 saniye**ye çıkarıldı:
```typescript
// src/lib/ihale/client.ts:45
setTimeout(() => controller.abort(), 120000); // 2 dakika
```

## Timeout Değerleri
- **Login**: 30 saniye (yeterli)
- **List**: 120 saniye (çok sayfalı listeler için)
- **Detail**: 90 saniye (büyük dosyalar için)
- **Proxy**: 90 saniye (dosya indirme)

## Config Dosyası
Timeout değerleri artık merkezi config'te:
```typescript
// src/lib/ihale/config.ts
export const IHALE_CONFIG = {
  TIMEOUTS: {
    LOGIN: 30_000,
    LIST: 120_000,
    DETAIL: 90_000,
    PROXY: 90_000,
  }
}
```

## Test
```bash
# İhale listesini yenile
curl -s "http://localhost:3000/api/ihale/list?refresh=true" -m 130

# 224 ihale yüklenmeli (9 sayfa x ~25 ihale)
```

## Gelecek İyileştirmeler
1. **Pagination UI**: Kullanıcıya "X/9 sayfa yükleniyor" göster
2. **Streaming Response**: İhaleler çekildikçe göster
3. **Background Job**: İhaleleri arka planda çek, database'e kaydet
4. **Cache Strategy**: Son çekilen ihaleleri cache'le

## İlgili Düzeltme
- **Session Timeout**: Oturum süreleri 8 saate çıkarıldı (bkz: `SESSION-TIMEOUT-FIX.md`)

---

**Tarih**: 12 Kasım 2025
**Durum**: ✅ Çözüldü
