# 🚀 Tesseract OCR - Hızlı Başlangıç

## 1️⃣ Environment Variables Ekle (2 dakika)

`.env.local` dosyanızı açın ve şu satırları ekleyin:

```env
# OCR Configuration
OCR_PROVIDER=auto
OCR_LANGUAGE=tur+eng
OCR_TIMEOUT=120000
```

**Mevcut `GOOGLE_AI_API_KEY`'inizi kontrol edin!**

## 2️⃣ Dev Server'ı Başlatın

```bash
npm run dev
```

## 3️⃣ Test Edin

1. `http://localhost:3000/analysis` sayfasına gidin
2. Büyük bir PDF (10-15 MB) yükleyin
3. Console'da şu logları göreceksiniz:

```
ℹ️  [INFO] Starting OCR with fallback support
ℹ️  [INFO] Starting AI-powered parsing with Gemini Vision
✅ [SUCCESS] OCR completed successfully
```

## 🎯 Ne Değişti?

### Öncesi (Sorunlar)
- ❌ Gemini quota aşımı → OCR başarısız
- ❌ OCR timeout (60s) → Büyük dosyalar hata veriyor
- ❌ PDF extraction hatası → Metin çıkmıyor

### Sonrası (Çözümler)
- ✅ Gemini quota aşımı → Tesseract devreye girer
- ✅ Timeout 120s → Daha büyük dosyalar işlenebilir
- ✅ PDF extraction hatası → OCR fallback çalışır

## 📊 Başarı Senaryoları

### Senaryo 1: Normal İşlem (Gemini Başarılı)
```
1. PDF yüklendi
2. Gemini Vision OCR çalıştı (15s)
3. Metin başarıyla çıkarıldı ✅
```

### Senaryo 2: Quota Aşımı (Tesseract Fallback)
```
1. PDF yüklendi
2. Gemini Vision OCR denendi
3. Quota aşımı hatası alındı
4. Tesseract.js devreye girdi (45s)
5. Metin başarıyla çıkarıldı ✅
```

### Senaryo 3: Timeout (Artırılmış Süre)
```
1. Büyük PDF (15 MB) yüklendi
2. Gemini Vision OCR başladı
3. 60s → 120s timeout ile tamamlandı ✅
```

## 🔍 Logları İzleme

Browser Console'da şu logları göreceksiniz:

```
// Gemini denemesi
ℹ️  [INFO] Starting OCR with fallback support
  provider: "auto"
  timeout: 120000

// Gemini başarılı
✅ [SUCCESS] OCR completed successfully
  provider: "gemini"
  textLength: 5420
  processingTime: 15000

// VEYA Gemini başarısız → Tesseract
⚠️  [WARN] Gemini OCR insufficient, falling back to Tesseract
✅ [SUCCESS] OCR completed with Tesseract fallback
  provider: "tesseract"
  textLength: 5180
  confidence: 0.89
  processingTime: 42000
```

## 🎛️ Provider Değiştirme

### Sadece Gemini Kullan (Hızlı, Quota-Limited)
```env
OCR_PROVIDER=gemini
```

### Sadece Tesseract Kullan (Yavaş, Sınırsız)
```env
OCR_PROVIDER=tesseract
```

### Auto Mode (Önerilen - Fallback)
```env
OCR_PROVIDER=auto
```

## ⚡ Performance Tips

### Hızlı Test İçin
```env
OCR_PROVIDER=gemini
OCR_TIMEOUT=60000
```

### Production İçin
```env
OCR_PROVIDER=auto
OCR_TIMEOUT=180000
```

### Quota Sorunlarında
```env
OCR_PROVIDER=tesseract
OCR_TIMEOUT=120000
```

## 🐛 Sorun Giderme

### "GOOGLE_AI_API_KEY not configured"
`.env.local` dosyanızda `GOOGLE_AI_API_KEY` tanımlı mı?

### "OCR timeout: 60 seconds exceeded"
Timeout'u artırın:
```env
OCR_TIMEOUT=180000
```

### "All OCR providers failed"
1. `GOOGLE_AI_API_KEY` geçerli mi kontrol edin
2. Internet bağlantınızı kontrol edin
3. PDF dosyası corrupt olabilir

## ✅ Başarı Kontrolü

Console'da şu loglara ulaşırsanız **başarılı**:

```
✅ [SUCCESS] OCR completed successfully
✅ [SUCCESS] Single file processing completed
```

## 📞 Yardım

Daha fazla bilgi için:
- `OCR-INTEGRATION-README.md` - Detaylı döküman
- `ENVIRONMENT-SETUP.txt` - Environment variables
- Console loglarını kontrol edin

---

**Hadi test edelim! 🚀**

