# 🔍 Tesseract OCR Entegrasyonu

## ✅ Tamamlandı

Tesseract.js multi-engine OCR sistemi başarıyla entegre edildi!

## 🎯 Özellikler

### 1. **Multi-Engine OCR Support**
- **Gemini Vision** (Hızlı, quota-limited)
- **Tesseract.js WASM** (Yavaş, sınırsız, Next.js uyumlu)
- **Auto mode** (Gemini → Tesseract fallback)

### 2. **Akıllı Fallback Mekanizması**
```
Gemini Vision dene
  ↓ Başarısız/Yetersiz?
Tesseract.js'e geç (WASM mode)
  ↓ Başarılı?
Metni döndür
```

### 3. **Konfigürasyon Seçenekleri**
- OCR provider seçimi (auto/gemini/tesseract)
- Dil desteği (Türkçe + İngilizce)
- Timeout ayarları
- Progress tracking

### 4. **WASM Mode (✨ Yeni!)**
- ✅ Tesseract, WebAssembly (WASM) modunda çalışır
- ✅ Node worker path problemi yok
- ✅ Next.js dev/prod ortamlarında aynı şekilde çalışır
- ✅ `MODULE_NOT_FOUND` hatası çözüldü
- ✅ Serverless/Docker deployment uyumlu

## 📦 Kurulum

### 1. Dependencies (Tamamlandı ✅)
```bash
npm install tesseract.js
npm install --save-dev @types/tesseract.js
```

### 2. Environment Variables (Manuel Eklenmeli)

`.env.local` dosyanıza şu satırları ekleyin:

```env
# OCR Configuration
OCR_PROVIDER=auto          # auto | gemini | tesseract
OCR_LANGUAGE=tur+eng       # Tesseract language codes
OCR_TIMEOUT=120000         # OCR timeout in milliseconds (120 seconds)

# Google AI (Gemini Vision)
GOOGLE_AI_API_KEY=your_google_ai_api_key_here

# İhale Worker (Mevcut)
IHALE_WORKER_URL=http://127.0.0.1:8080
IHALEBUL_USERNAME=your_username
IHALEBUL_PASSWORD=your_password
```

**Not:** `.env.local` dosyası `.gitignore`'da olduğu için yukarıdaki değerleri manuel olarak eklemelisiniz.

## 🔧 Kullanım

### Otomatik Mod (Önerilen)
```env
OCR_PROVIDER=auto
```
- Önce Gemini Vision dener (hızlı)
- Başarısız/yetersiz ise Tesseract'a geçer

### Sadece Gemini
```env
OCR_PROVIDER=gemini
```
- Sadece Gemini Vision kullanır
- Quota aşımında hata verir

### Sadece Tesseract
```env
OCR_PROVIDER=tesseract
```
- Sadece Tesseract.js kullanır
- Quota sınırı yok ama daha yavaş

## 📊 Performans

| Provider | Hız | Quota | Doğruluk |
|----------|-----|-------|----------|
| Gemini Vision | ⚡ Hızlı (5-30s) | ⚠️ 10/dk | 🌟 Yüksek |
| Tesseract.js | 🐌 Yavaş (20-60s) | ✅ Sınırsız | ⭐ Orta |
| Auto (Fallback) | ⚡→🐌 Değişken | ✅ En iyi | 🌟 Yüksek |

## 🗂️ Değişen Dosyalar

### Yeni Dosyalar
1. ✅ `src/lib/document-processor/ocr-service.ts` - OCR engine wrapper

### Güncellenen Dosyalar
1. ✅ `src/lib/document-processor/extractor.ts` - extractTextWithOCR fonksiyonu
2. ✅ `src/app/api/analysis/process-single/route.ts` - runOCRGemini fonksiyonu
3. ✅ `src/app/api/ihale/upload/route.ts` - runOCRGemini fonksiyonu
4. ✅ `src/lib/ai/ocr-handler.ts` - runOCRWithGemini fonksiyonu

## 🔍 OCR Service API

### Temel Kullanım

```typescript
import { OCRService } from '@/lib/document-processor/ocr-service';

// Tek görüntü OCR
const result = await OCRService.performOCR(imageBuffer, {
  provider: 'auto',
  language: 'tur+eng',
  timeout: 120000,
});

console.log(`Provider: ${result.provider}`);
console.log(`Text: ${result.text}`);
console.log(`Confidence: ${result.confidence}`);
```

### Batch OCR

```typescript
const results = await OCRService.batchOCR(
  [buffer1, buffer2, buffer3],
  { provider: 'auto', language: 'tur+eng' },
  (message, progress) => {
    console.log(`${message} - ${progress}%`);
  }
);
```

## 🐛 Troubleshooting

### Gemini Quota Aşımı
```
Error: [429 Too Many Requests] You exceeded your current quota
```

**Çözüm:**
1. `.env.local`'de `OCR_PROVIDER=tesseract` yapın
2. Veya `OCR_PROVIDER=auto` ile fallback kullanın
3. Gemini API quota'nızı yükseltin

### Tesseract Yavaş
Tesseract.js browser tabanlı OCR yaptığı için daha yavaş olabilir.

**Optimizasyon:**
- `OCR_TIMEOUT` değerini artırın (180000 = 3 dakika)
- Büyük PDF'leri sayfalara bölerek işleyin

### OCR Sonuç Boş
```
AILogger: OCR failed, using original text
```

**Kontrol:**
1. Görüntü formatı destekleniyor mu? (PNG, JPEG, PDF)
2. Görüntü çok küçük/büyük mü?
3. Görüntüde text var mı?

## 📈 Monitoring

OCR işlemleri AILogger ile loglanır:

```typescript
AILogger.info('✅ OCR completed successfully', {
  filename: 'document.pdf',
  provider: 'gemini',
  textLength: 5420,
  confidence: 0.92,
  processingTime: 12500
});
```

## 🎉 Sonuç

- ✅ Tesseract.js kuruldu
- ✅ OCR Service oluşturuldu
- ✅ Multi-engine fallback mekanizması eklendi
- ✅ Tüm OCR noktaları güncellendi
- ✅ Progress tracking ve error handling eklendi
- ✅ Linting hatasız
- ⚠️ Environment variables manuel eklenmeli

## 🚀 Sonraki Adımlar

1. **Manuel:** `.env.local` dosyasına environment variables ekleyin
2. **Opsiyonel:** LibreOffice kurun (.doc dosyaları için): `brew install libreoffice`
3. **Test:** Büyük bir PDF yükleyip OCR fallback'ini test edin

## 📝 Test

```bash
# Dev server başlat
npm run dev

# İhale worker'ı başlat (ayrı terminal)
cd ihale-worker && npm run dev

# http://localhost:3000/analysis sayfasında büyük bir PDF yükleyin
# Console loglarını izleyin:
# - Gemini denemesi
# - Timeout/quota aşımı
# - Tesseract fallback
# - Başarılı OCR
```

## 📞 Destek

Sorun yaşarsanız:
1. Console loglarını kontrol edin
2. AILogger çıktılarına bakın
3. Environment variables'ları doğrulayın
4. Gemini API key'inizi test edin

