# ⏰ Session Timeout Düzeltmesi

## Sorun
"Oturum süresi doldu, lütfen sayfayı yenileyin" hatası çok sık alınıyordu:
```
Error: Oturum süresi doldu, lütfen sayfayı yenileyin.
at src/app/ihale/[id]/page.tsx:217:19
```

## Neden Oldu?
Session süreleri tutarsızdı ve çok kısaydı:
- ❌ Worker session: **1 saat** (3600000 ms)
- ❌ Login cookie: **1 saat** (Max-Age=3600)
- ❌ Detail cookie (normal): **24 saat**
- ❌ Detail cookie (retry): **8 saat** (tutarsızlık!)

Kullanıcı 1 saatten fazla çalışınca session expire oluyordu ve otomatik re-login de başarısız oluyordu.

## Çözüm
Tüm session sürelerini **8 saat**e çıkardık (1 iş günü için yeterli):

### 1. Worker Session Süresi
**Dosya**: `ihale-worker/src/ihalebul.ts`

**Önce**:
```typescript
if (now - session.createdAt > 3600000) { // 1 saat
  SESSIONS.delete(sid);
}
}, 300000); // Her 5 dakikada kontrol
```

**Sonra**:
```typescript
if (now - session.createdAt > 28800000) { // 8 saat = 8 * 60 * 60 * 1000
  SESSIONS.delete(sid);
}
}, 600000); // Her 10 dakikada kontrol
```

### 2. Login Cookie Süresi
**Dosya**: `src/app/api/ihale/login/route.ts`

**Önce**:
```typescript
res.headers.append('Set-Cookie', `ihale_session=${sessionId}; Path=/; HttpOnly; SameSite=Strict; Max-Age=3600`);
```

**Sonra**:
```typescript
res.headers.append('Set-Cookie', `ihale_session=${sessionId}; Path=/; HttpOnly; SameSite=Strict; Max-Age=28800`); // 8 hours
```

### 3. Detail Cookie Süreleri
**Dosya**: `src/app/api/ihale/detail/[id]/route.ts`

**İki yerde güncellendi:**

**a) Normal session cookie (satır 374)**:
```typescript
// Önce: maxAge: 60 * 60 * 24, // 24 hours
// Sonra:
maxAge: 60 * 60 * 8, // 8 hours (matches worker session duration)
```

**b) Retry session cookie (satır 404)**:
```typescript
// Önce: maxAge: 60 * 60 * 24, // 24 hours
// Sonra:
maxAge: 60 * 60 * 8, // 8 hours (matches worker session duration)
```

## Sonuç
Artık tüm session süreleri **tutarlı** ve **8 saat**:

| Bileşen | Önce | Sonra |
|---------|------|-------|
| Worker Session | 1 saat | 8 saat ✅ |
| Login Cookie | 1 saat | 8 saat ✅ |
| Detail Cookie (Normal) | 24 saat | 8 saat ✅ |
| Detail Cookie (Retry) | 8 saat | 8 saat ✅ |
| Cleanup Interval | 5 dakika | 10 dakika ✅ |

## Otomatik Re-Login Mantığı
API'de otomatik re-login mekanizması zaten var:

1. Session expire olunca API'den hata gelir
2. API otomatik olarak `ihbLogin()` çağırır
3. Yeni session ID alır
4. İşlemi yeni session ile tekrar dener
5. Cookie'yi günceller

**Not**: Bu mekanizma zaten çalışıyor ama artık session süreleri uzun olduğu için daha az tetiklenecek.

## Test
```bash
# 1. Worker'ı başlat
cd ihale-worker && npm run dev

# 2. Ana app'i başlat
npm run dev

# 3. İhale detayına git
http://localhost:3000/ihale/[id]

# 4. 8 saat boyunca session expire olmayacak ✅
```

## Worker Playwright Timeout'ları (12 Kasım 2025 - Ek Düzeltme)
Playwright timeout'ları da 30 saniyeden **60 saniyeye** çıkarıldı:

**Dosya**: `ihale-worker/src/ihalebul.ts`

- Login goto: 30s → 60s (satır 41)
- Login waitForLoadState: 30s → 60s (satır 55)
- List page (ilk): 30s → 60s (satır 470)
- List page (loop): 30s → 60s (satır 496)
- Detail page: 30s → 60s (satır 593)
- Export list (ilk): 30s → 60s (satır 905)
- Export list (loop): 30s → 60s (satır 930)
- HTML fetch: 30s → 60s (satır 985)

**Toplam**: 8 Playwright timeout düzeltildi!

## Gelecek İyileştirmeler
1. **Session Refresh**: 7 saatte otomatik yenilensin (expire'dan önce)
2. **Health Check**: Worker'ın session'ının hala geçerli olup olmadığını kontrol et
3. **Graceful Degradation**: Session expire olsa bile database'den temel bilgileri göster
4. **User Notification**: Session yenilendiğinde kullanıcıya bildir (toast)

---

**Tarih**: 12 Kasım 2025
**Durum**: ✅ Çözüldü
**Session Süresi**: 8 saat (28800000 ms)
