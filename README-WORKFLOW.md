# 🤖 Claude-Cursor Workflow Kullanım Kılavuzu

Bu dokümantasyon, ProCheff-v3 projesinde Claude AI ve Cursor IDE arasındaki işbirliği için hazırlanmıştır.

---

## 🚀 Hızlı Başlangıç

### 1. Workflow Dosyası
Ana workflow dokümantasyonu: [`docs/Claude-Cursor-Workflow.md`](./docs/Claude-Cursor-Workflow.md)

### 2. Otomatik Script'ler

#### 🎯 EN KOLAY: Claude Çıktısını Otomatik Kaydet ve İşle
```bash
# macOS'ta (Claude'dan çıktıyı kopyala, sonra):
pbpaste | node scripts/claude-save.js
```

Bu script:
- ✅ Claude çıktısını `.workflow/claude-cevap.md`'ye kaydeder
- ✅ Otomatik olarak workflow script'ini çalıştırır
- ✅ Todo list ve plan oluşturur

#### Manuel Kullanım

**Claude Çıktısını Cursor Prompt'a Dönüştür:**
```bash
node scripts/claude-cursor-bridge.js claude-output.md --format=prompt
```

**Todo List Oluştur:**
```bash
node scripts/claude-cursor-bridge.js claude-output.md --format=todo --output=todos.json
```

**Implementation Plan Oluştur:**
```bash
node scripts/auto-workflow.js claude-output.md
```

---

## 📋 Kullanım Senaryoları

### Senaryo 1: Yeni Özellik Geliştirme

1. **Claude'a görev ver:**
   ```
   "Yeni bir özellik ekle: [özellik adı]. 
   Mevcut sistemle uyumlu olmalı.
   Markdown formatında, adım adım plan ver."
   ```

2. **Claude çıktısını otomatik kaydet ve işle:**
   ```bash
   # Claude'dan çıktıyı kopyala (Cmd+C), sonra:
   pbpaste | node scripts/claude-save.js
   ```

3. **Todo list'i kullan:**
   - `.workflow/todos.json` dosyasındaki todo'ları Cursor'a import et
   - `.workflow/plan.md` dosyasındaki planı takip et
   - Adım adım implementation yap

### Senaryo 2: Bug Fix

1. **Claude'a hata bildir:**
   ```
   "[Bug açıklaması] hatası var. 
   Analiz et ve düzelt."
   ```

2. **Fix planını oluştur:**
   ```bash
   node scripts/claude-cursor-bridge.js fix-output.md --format=prompt > fix-prompt.md
   ```

3. **Fix'i uygula:**
   - Cursor'da `fix-prompt.md` dosyasını aç
   - Claude'dan gelen önerileri uygula

### Senaryo 3: Refactoring

1. **Claude'a refactor isteği ver:**
   ```
   "[Dosya/Modül] refactor et. 
   [Hedefler] sağla."
   ```

2. **Refactor planını oluştur:**
   ```bash
   node scripts/auto-workflow.js refactor-output.md
   ```

3. **Plan'a göre refactor et:**
   - `.workflow/plan.md` dosyasını takip et
   - Her adımı test et

---

## 🛠️ Script Detayları

### `claude-save.js` ⭐ YENİ

**Özellikler:**
- Claude çıktısını otomatik olarak dosyaya kaydeder
- Clipboard'dan okur (macOS)
- Stdin'den okur (interactive mode)
- Otomatik olarak workflow script'ini çalıştırır

**Kullanım:**
```bash
# Yöntem 1: Clipboard'dan (macOS - EN KOLAY)
pbpaste | node scripts/claude-save.js

# Yöntem 2: Interactive mode
node scripts/claude-save.js
# (Claude çıktısını yapıştır, Ctrl+D ile bitir)

# Yöntem 3: Dosyadan
node scripts/claude-save.js < claude-output.txt
```

**Çıktılar:**
- `.workflow/claude-cevap.md` - Kaydedilen Claude çıktısı
- `.workflow/todos.json` - Otomatik oluşturulan todo list
- `.workflow/plan.md` - Otomatik oluşturulan implementation plan
- `.workflow/summary.json` - Özet bilgiler

### `claude-cursor-bridge.js`

**Özellikler:**
- Claude çıktısını parse eder
- Cursor prompt formatına dönüştürür
- Todo list oluşturur
- Summary oluşturur

**Formatlar:**
- `prompt` - Cursor prompt formatı
- `todo` - JSON todo list
- `summary` - JSON summary

### `auto-workflow.js`

**Özellikler:**
- Implementation plan çıkarır
- Dosya listesi oluşturur
- Dependency listesi oluşturur
- Tahmini süre hesaplar

**Çıktılar:**
- `.workflow/todos.json` - Todo list
- `.workflow/plan.md` - Implementation plan
- `.workflow/summary.json` - Özet bilgiler

---

## 📚 İlgili Dokümantasyon

- [`docs/Claude-Cursor-Workflow.md`](./docs/Claude-Cursor-Workflow.md) - Ana workflow
- [`docs/IMPLEMENTATION-GUIDE.md`](./docs/IMPLEMENTATION-GUIDE.md) - Implementation kılavuzu
- [`docs/ARCHITECTURE-ANALYSIS.md`](./docs/ARCHITECTURE-ANALYSIS.md) - Mimari analiz

---

*Bu workflow, ProCheff-v3 projesinde AI destekli geliştirme süreçlerini optimize etmek için oluşturulmuştur.*

