# 🚀 Basit Kullanım Kılavuzu

## 📋 Günlük Kullanım (Sadece bunları kullan!)

### 1. 🟢 **Temiz Başlat** (EN ÇOK KULLANILAN)

```bash
npm run basla
```

**Ne yapar:**
- ✅ .next klasörünü temizler
- ✅ Dev server'ı başlatır
- ✅ Temiz bir başlangıç yapar

**Ne zaman kullanılır:**
- Her sabah işe başlarken
- Garip hatalar görünce
- Önbellek sorunları olunca

---

### 2. 🤖 **Worker Başlat** (İhale scraper için)

```bash
npm run worker
```

**Ne yapar:**
- ✅ İhale worker'ı temiz başlatır
- ✅ Eski process'leri otomatik öldürür
- ✅ Port 8080'i temizler

**Ne zaman kullanılır:**
- İhale scraping yapacaksan
- "Worker not running" hatası alırsan

---

### 3. 🏗️ **Production Build**

```bash
npm run build
npm start
```

**Ne yapar:**
- ✅ Production için derler
- ✅ Optimize eder
- ✅ Çalıştırır

**Ne zaman kullanılır:**
- Deploy öncesi
- Production test için

---

## 🛠️ Yardımcı Komutlar

### Temizlik

```bash
npm run temizle        # .next klasörünü sil
npm run sil-hepsi      # Her şeyi sil (dikkatli!)
```

### Kod Kalitesi

```bash
npm run duzelt         # Lint hatalarını otomatik düzelt
npm run duzenle        # Kod formatını düzelt
npm run tip-kontrol    # TypeScript hatalarını kontrol et
```

---

## 🎯 Basit Workflow

### Günlük Kullanım:

```bash
# Sabah
npm run basla

# Worker gerekiyorsa (ayrı terminal)
npm run worker
```

### Sorun Olursa:

```bash
# Cache temizle
npm run temizle

# Tekrar başlat
npm run basla
```

### Deploy Öncesi:

```bash
# Kod kontrol
npm run tip-kontrol
npm run duzelt

# Build test
npm run build
```

---

## ❓ Hangi Komutu Kullanmalıyım?

| Durum | Komut |
|-------|-------|
| 🌅 Sabah işe başlarken | `npm run basla` |
| 🔧 Geliştirme yapıyorum | `npm run dev` (veya `basla`) |
| 🤖 İhale scraping lazım | `npm run worker` |
| 🐛 Garip hata var | `npm run temizle` + `npm run basla` |
| 🚀 Deploy edeceğim | `npm run build` |
| 📝 Kod düzelt | `npm run duzelt` |

---

## 🚨 Sorun Giderme

### "Port already in use"
```bash
# Worker için
cd ihale-worker && npm run kill

# Ana proje için
lsof -ti:3000 | xargs kill -9
```

### "Cache hatası"
```bash
npm run temizle
npm run basla
```

### "Worker not running"
```bash
npm run worker
```

### "Zombie process"
```bash
cd ihale-worker && npm run kill
npm run worker
```

---

## 💡 İpuçları

1. **Her sabah:** `npm run basla` ile başla
2. **Worker lazımsa:** Ayrı terminal'de `npm run worker`
3. **Sorun çıkarsa:** `npm run temizle` + `npm run basla`
4. **Deploy öncesi:** `npm run build` test et

---

## 📚 Eski Komutlar (Artık gerekmiyor!)

Bu komutları KULLANMA:
- ❌ `scripts/fresh-start.sh` 
- ❌ `dev:turbo`
- ❌ `dev:https`
- ❌ `worker:dev` (yerine: `npm run worker`)

Sadece yukarıdaki basit komutları kullan! ✅

---

**Tek bilmen gereken:** `npm run basla` 🚀

