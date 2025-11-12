# 🤖 Claude-Cursor AI İşbirliği Protokolü
*ProCheff-v3 Geliştirme Hattı*

---

## 📋 Genel Bakış

Bu dokümantasyon, Claude AI ve Cursor IDE arasında etkili bir işbirliği için standart workflow'u tanımlar. ProCheff-v3 projesinde AI destekli geliştirme süreçlerini optimize etmek için kullanılır.

---

## 🔄 Workflow Adımları

### 1. Görev Tanımlama
```
Kullanıcı → Cursor → Claude
```
- Kullanıcı Cursor'da görevi tanımlar
- Claude görevi analiz eder ve plan oluşturur
- Görev önceliklendirilir ve adımlara bölünür

### 2. Kod Analizi
```
Claude → Codebase Search → Analiz
```
- Mevcut kod yapısı analiz edilir
- İlgili dosyalar tespit edilir
- Bağımlılıklar ve etkileşimler haritalanır

### 3. Implementation
```
Claude → Code Changes → Review
```
- Kod değişiklikleri yapılır
- Best practices uygulanır
- Type safety ve error handling kontrol edilir

### 4. Validation
```
Claude → Linter Check → Test
```
- Linter hataları kontrol edilir
- Kod tutarlılığı doğrulanır
- Mantıksal bütünlük test edilir

### 5. Documentation
```
Claude → Docs Update → Summary
```
- Değişiklikler dokümante edilir
- Kullanım örnekleri eklenir
- Migration guide'lar güncellenir

---

## 🎯 Görev Tipleri

### A. Yeni Özellik Geliştirme
**Workflow:**
1. Feature request analizi
2. Architecture review
3. Implementation plan
4. Code implementation
5. Integration testing
6. Documentation

**Örnek Prompt:**
```
"Yeni bir özellik ekle: [özellik adı]. 
Mevcut sistemle uyumlu olmalı, 
[gereksinimler] karşılamalı."
```

### B. Bug Fix
**Workflow:**
1. Bug reproduction
2. Root cause analysis
3. Fix implementation
4. Regression testing
5. Documentation update

**Örnek Prompt:**
```
"[Bug açıklaması] hatası var. 
Analiz et ve düzelt. 
Benzer hataların olup olmadığını kontrol et."
```

### C. Refactoring
**Workflow:**
1. Code smell detection
2. Refactoring plan
3. Incremental changes
4. Test after each change
5. Documentation update

**Örnek Prompt:**
```
"[Dosya/Modül] refactor et. 
[Hedefler] sağla. 
Mevcut functionality'yi koru."
```

### D. Performance Optimization
**Workflow:**
1. Performance profiling
2. Bottleneck identification
3. Optimization strategy
4. Implementation
5. Benchmark comparison

**Örnek Prompt:**
```
"[İşlem] çok yavaş. 
Performans analizi yap ve optimize et. 
[Target] hedefle."
```

---

## 📝 Prompt Şablonları

### Feature Request Template
```
🎯 Görev: [Özellik Adı]
📋 Açıklama: [Detaylı açıklama]
🔗 İlgili Dosyalar: [Dosya listesi]
✅ Beklenen Sonuç: [Kriterler]
⚠️ Dikkat Edilmesi Gerekenler: [Notlar]
```

### Bug Fix Template
```
🐛 Hata: [Hata açıklaması]
📍 Lokasyon: [Dosya:satır veya endpoint]
🔄 Adımlar: [Reproduction steps]
✅ Beklenen: [Expected behavior]
❌ Gerçek: [Actual behavior]
```

### Refactoring Template
```
🔧 Refactor: [Modül/Dosya]
📊 Mevcut Durum: [Açıklama]
🎯 Hedef: [İyileştirme hedefleri]
✅ Kriterler: [Başarı kriterleri]
```

---

## 🔍 Code Review Checklist

### Claude Tarafından Kontrol Edilecekler

- [ ] **Type Safety**: Tüm `any` tipler kaldırıldı mı?
- [ ] **Error Handling**: Tüm async işlemler try-catch içinde mi?
- [ ] **Consistency**: Kod stili mevcut pattern'lere uygun mu?
- [ ] **Performance**: Gereksiz re-render veya computation var mı?
- [ ] **Security**: Input validation ve sanitization yapılıyor mu?
- [ ] **Documentation**: JSDoc comments eklendi mi?
- [ ] **Testing**: Edge case'ler handle ediliyor mu?
- [ ] **Accessibility**: UI component'ler erişilebilir mi?

---

## 🛠️ Araçlar ve Utility'ler

### Mevcut Utility'ler
- `errorHandler` - Standart error handling
- `StorageManager` - localStorage yönetimi
- `DataPoolManager` - State management
- `SSEStream` - Server-Sent Events
- `RequestManager` - Request deduplication

### Kullanım Örnekleri
```typescript
// Error Handler
export const POST = errorHandler(async (req) => {
  // Handler logic
});

// StorageManager
storage.setTemp('key', data);
const data = storage.getTemp('key');

// DataPoolManager
await DataPoolManager.save(id, dataPool, metadata);
const pool = await DataPoolManager.get(id);

// SSEStream
return createSSEResponse(async (stream) => {
  stream.sendProgress('stage', 50, 'Message');
  stream.sendSuccess(result);
});

// RequestManager
await RequestManager.request('key', async (signal) => {
  return await fetch(url, { signal });
});
```

---

## 📊 İlerleme Takibi

### Todo List Pattern
```typescript
todo_write({
  merge: false,
  todos: [
    { id: '1', status: 'in_progress', content: 'Task 1' },
    { id: '2', status: 'pending', content: 'Task 2' }
  ]
});
```

### Status Updates
- `pending` - Henüz başlanmadı
- `in_progress` - Devam ediyor
- `completed` - Tamamlandı
- `cancelled` - İptal edildi

---

## 🚨 Hata Yönetimi

### Error Code System
```typescript
import { createErrorResponse, ErrorCode } from '@/lib/utils/error-codes';

// Kullanım
return NextResponse.json(
  createErrorResponse('FILE_TOO_LARGE', 'Dosya çok büyük'),
  { status: 413 }
);
```

### Logging Pattern
```typescript
import { AILogger } from '@/lib/ai/logger';

AILogger.info('Operation started', { context });
AILogger.error('Operation failed', { error, context });
AILogger.success('Operation completed', { result });
```

---

## 🤖 Otomatik Görev Zinciri

### Bridge Script Kullanımı

**Claude çıktısını Cursor prompt'a dönüştür:**
```bash
node scripts/claude-cursor-bridge.js claude-output.md --format=prompt
```

**Todo list oluştur:**
```bash
node scripts/claude-cursor-bridge.js claude-output.md --format=todo --output=todos.json
```

**Summary oluştur:**
```bash
node scripts/claude-cursor-bridge.js claude-output.md --format=summary
```

### Auto Workflow Script

**Implementation plan oluştur:**
```bash
node scripts/auto-workflow.js claude-output.md
```

Bu script:
- ✅ Claude çıktısını parse eder
- ✅ Todo list oluşturur (`.workflow/todos.json`)
- ✅ Implementation plan oluşturur (`.workflow/plan.md`)
- ✅ Summary oluşturur (`.workflow/summary.json`)

**Çıktı:**
```
.workflow/
  ├── todos.json      # Todo list (Cursor'a import edilebilir)
  ├── plan.md         # Detaylı implementation plan
  └── summary.json    # Özet bilgiler
```

---

## 📚 Dokümantasyon Standartları

### Yeni Dosya Oluştururken
1. File header comment (açıklama)
2. Import'lar organize edilmiş
3. Type definitions
4. Main functions
5. Export statements

### Değişiklik Yaparken
1. Mevcut pattern'lere uygunluk
2. Backward compatibility
3. Migration guide (breaking changes için)
4. Usage examples

---

## 🔄 Git Workflow

### Commit Message Format
```
[Type] Brief description

Detailed explanation if needed

- Change 1
- Change 2
```

**Types:**
- `feat` - Yeni özellik
- `fix` - Bug fix
- `refactor` - Refactoring
- `docs` - Dokümantasyon
- `perf` - Performance
- `test` - Test

---

## 🎓 Best Practices

### 1. Incremental Changes
- Küçük, test edilebilir değişiklikler
- Her değişiklikten sonra test
- Rollback kolaylığı

### 2. Type Safety First
- `any` kullanımından kaçın
- Strict TypeScript
- Runtime validation (Zod)

### 3. Error Handling
- Tüm async işlemler try-catch
- User-friendly error messages
- Error logging

### 4. Performance
- Lazy loading
- Memoization
- Debouncing/Throttling

### 5. Code Organization
- Single Responsibility Principle
- DRY (Don't Repeat Yourself)
- Clear naming conventions

---

## 🔗 İlgili Dokümantasyon

- `ARCHITECTURE-ANALYSIS.md` - Mimari analiz
- `SECOND-LEVEL-ANALYSIS.md` - İkinci seviye analiz
- `IMPLEMENTATION-GUIDE.md` - Implementation kılavuzu
- `FIXES-APPLIED.md` - Uygulanan düzeltmeler

---

## 📞 İletişim ve Feedback

Workflow'da iyileştirme önerileri için:
1. Mevcut workflow'u analiz et
2. Zayıf noktaları tespit et
3. İyileştirme önerileri sun
4. Yeni pattern'ler öner

---

*Bu workflow, ProCheff-v3 projesinde AI destekli geliştirme süreçlerini standardize etmek için oluşturulmuştur.*
