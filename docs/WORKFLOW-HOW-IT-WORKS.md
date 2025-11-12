# 🔧 Claude-Cursor Workflow Nasıl Çalışır?

*Detaylı Kullanım Kılavuzu ve Örnekler*

---

## 📖 Genel Bakış

Bu workflow, Claude AI'dan gelen çıktıları otomatik olarak işleyip Cursor IDE'de kullanılabilir formata dönüştürür. İki ana script var:

1. **`claude-cursor-bridge.js`** - Claude çıktısını parse eder ve farklı formatlara dönüştürür
2. **`auto-workflow.js`** - Implementation plan çıkarır ve todo list oluşturur

---

## 🎯 Senaryo 1: Basit Kullanım

### Adım 1: Claude'dan Çıktı Al

Claude'a bir görev ver ve çıktıyı bir dosyaya kaydet:

```markdown
# Yeni Özellik: Kullanıcı Bildirimleri

## Görev
Kullanıcılara real-time bildirimler göster.

## Implementation Plan

1. Notification component oluştur
2. WebSocket bağlantısı kur
3. Backend'de notification API ekle
4. Frontend'de notification center ekle

## Kod Örnekleri

\`\`\`typescript
// src/components/NotificationCenter.tsx
export function NotificationCenter() {
  // Component code
}
\`\`\`

⚠️ Dikkat: WebSocket bağlantısı için rate limiting ekle
✅ Öneri: Zustand store kullan
```

Bu çıktıyı `claude-output.md` dosyasına kaydet.

### Adım 2: Script'i Çalıştır

```bash
node scripts/claude-cursor-bridge.js claude-output.md --format=prompt
```

**Çıktı:**
```markdown
# Cursor Prompt - 2025-11-12T10:30:00.000Z

## Görevler

1. Yeni Özellik: Kullanıcı Bildirimleri

## Kod Değişiklikleri

### typescript Block 1

```typescript
// src/components/NotificationCenter.tsx
export function NotificationCenter() {
  // Component code
}
```

## Notlar

⚠️ Dikkat: WebSocket bağlantısı için rate limiting ekle
✅ Öneri: Zustand store kullan
```

Bu çıktıyı Cursor'da prompt olarak kullanabilirsin!

---

## 🎯 Senaryo 2: Todo List Oluşturma

### Adım 1: Claude Çıktısı

```markdown
# Bug Fix: SSE Stream Hataları

## Sorun
SSE stream'lerde connection drop oluyor.

## Çözüm Adımları

1. Error handling ekle
2. Reconnection logic implement et
3. Timeout mekanizması ekle
4. Test et
```

### Adım 2: Todo List Oluştur

```bash
node scripts/claude-cursor-bridge.js bug-fix.md --format=todo --output=todos.json
```

**Çıktı (`todos.json`):**
```json
{
  "todos": [
    {
      "id": "task-1",
      "status": "pending",
      "content": "Bug Fix: SSE Stream Hataları"
    }
  ]
}
```

Bu JSON'u Cursor'da `todo_write` tool'una import edebilirsin!

---

## 🎯 Senaryo 3: Implementation Plan

### Adım 1: Detaylı Claude Çıktısı

```markdown
# Refactoring: Error Handling

## Plan

1. Error handler middleware oluştur
2. Tüm API route'ları güncelle
3. Frontend error handling iyileştir
4. Test coverage ekle

## Dosyalar

\`\`\`12:45:src/app/api/analysis/upload/route.ts
// Mevcut kod
\`\`\`

\`\`\`1:20:src/lib/middleware/error-handler.ts
// Yeni middleware
\`\`\`

## Dependencies

- @/lib/utils/error-codes
- @/lib/ai/logger
```

### Adım 2: Auto Workflow Çalıştır

```bash
node scripts/auto-workflow.js refactor-output.md
```

**Çıktılar:**

**`.workflow/todos.json`:**
```json
{
  "todos": [
    {
      "id": "step-1",
      "status": "pending",
      "content": "Error handler middleware oluştur"
    },
    {
      "id": "step-2",
      "status": "pending",
      "content": "Tüm API route'ları güncelle"
    },
    {
      "id": "step-3",
      "status": "pending",
      "content": "Frontend error handling iyileştir"
    },
    {
      "id": "step-4",
      "status": "pending",
      "content": "Test coverage ekle"
    }
  ]
}
```

**`.workflow/plan.md`:**
```markdown
# Implementation Plan

**Oluşturulma:** 2025-11-12T10:30:00.000Z

## Özet

- 4 adım
- 2 dosya değişikliği
- 2 dependency
- Tahmini süre: 60 dakika

## Adımlar

1. Error handler middleware oluştur
2. Tüm API route'ları güncelle
3. Frontend error handling iyileştir
4. Test coverage ekle

## Dosyalar

- `src/app/api/analysis/upload/route.ts` (12-45)
- `src/lib/middleware/error-handler.ts` (1-20)

## Dependencies

- `@/lib/utils/error-codes`
- `@/lib/ai/logger`
```

**`.workflow/summary.json`:**
```json
{
  "timestamp": "2025-11-12T10:30:00.000Z",
  "totalSteps": 4,
  "filesToModify": 2,
  "dependencies": 2,
  "todos": 4,
  "estimatedTime": "60 dakika",
  "files": [
    "src/app/api/analysis/upload/route.ts",
    "src/lib/middleware/error-handler.ts"
  ],
  "summary": "4 adım, 2 dosya, 2 dependency"
}
```

---

## 🔍 Script'ler Nasıl Çalışıyor?

### `claude-cursor-bridge.js` İç Yapısı

```javascript
// 1. Dosyayı oku
const content = fs.readFileSync(inputFile, 'utf-8');

// 2. Parse et
const parsed = parseClaudeOutput(content);
// - Task'ları bul (## veya ### başlıkları)
// - Code block'ları bul (```language)
// - Notları bul (⚠️, ✅, ❌ emoji'leri)

// 3. Format'a dönüştür
switch (format) {
  case 'prompt':
    return toCursorPrompt(parsed);
  case 'todo':
    return toTodoList(parsed);
  case 'summary':
    return toSummary(parsed);
}

// 4. Çıktıyı yaz
fs.writeFileSync(outputFile, output);
```

### `auto-workflow.js` İç Yapısı

```javascript
// 1. Dosyayı oku
const content = fs.readFileSync(inputFile, 'utf-8');

// 2. Implementation plan çıkar
const plan = extractImplementationPlan(content);
// - Adımları bul (numara ile başlayan satırlar)
// - Dosya referanslarını bul (```startLine:endLine:filepath)
// - Dependency'leri bul (import statements)

// 3. Todo list oluştur
const todos = createTodoList(plan);

// 4. Summary oluştur
const summary = createSummary(plan, todos);

// 5. Dosyalara yaz
// - .workflow/todos.json
// - .workflow/plan.md
// - .workflow/summary.json
```

---

## 📝 Parse Edilen Formatlar

### Task Detection
```markdown
## Görev Başlığı        ✅ Bulunur
### Alt Görev           ✅ Bulunur
# Ana Başlık            ❌ Bulunmaz (çok genel)
```

### Code Block Detection
```markdown
```typescript
code here
```                    ✅ Bulunur

```12:45:src/file.ts
code here
```                    ✅ Bulunur (file reference)

\`\`\`                  ❌ Bulunmaz (escaped)
```

### Note Detection
```markdown
⚠️ Dikkat: ...          ✅ Bulunur
✅ Öneri: ...           ✅ Bulunur
❌ Hata: ...            ✅ Bulunur
💡 İpucu: ...           ✅ Bulunur
🔍 Not: ...             ✅ Bulunur
📝 Todo: ...            ✅ Bulunur
```

### Step Detection (auto-workflow.js)
```markdown
1. İlk adım             ✅ Bulunur
2. İkinci adım          ✅ Bulunur
   - Alt madde          ❌ Bulunmaz
```

### File Reference Detection
```markdown
```12:45:src/file.ts     ✅ Bulunur
code
```

Dosya: src/file.ts      ❌ Bulunmaz (bu format desteklenmiyor)
```

---

## 🎨 Gerçek Kullanım Örneği

### Örnek: Yeni Feature Request

**1. Claude'a sor:**
```
"ProCheff-v3'e yeni bir özellik ekle: 
Kullanıcılar analiz sonuçlarını PDF olarak export edebilsin.
Mevcut export sistemini kullan."
```

**2. Claude çıktısı (`feature-export.md`):**
```markdown
# PDF Export Özelliği

## Implementation

1. PDF generation library ekle (pdfkit veya jspdf)
2. Export button component oluştur
3. Backend API endpoint ekle
4. Frontend'de export fonksiyonu implement et

## Kod

\`\`\`typescript
// src/components/ExportButtons.tsx
export function ExportButtons({ data }) {
  const exportPDF = () => {
    // PDF generation
  };
}
\`\`\`

⚠️ Dikkat: Büyük dosyalar için streaming gerekebilir
✅ Öneri: Mevcut CSV export pattern'ini takip et
```

**3. Script çalıştır:**
```bash
node scripts/auto-workflow.js feature-export.md
```

**4. Çıktıları kullan:**

**Todo list'i Cursor'a import et:**
```typescript
// Cursor'da
const todos = require('.workflow/todos.json');
todo_write({ merge: false, todos: todos.todos });
```

**Plan'a göre implement et:**
- `.workflow/plan.md` dosyasını aç
- Adım adım ilerle
- Her adımı tamamladığında todo'yu `completed` yap

---

## 🔄 Workflow Döngüsü

```
┌─────────────┐
│   Claude    │
│   (Görev)   │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   Çıktı     │
│  (Markdown) │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   Script    │
│  (Parse)    │
└──────┬──────┘
       │
       ├──► Todo List
       ├──► Plan
       └──► Summary
       │
       ▼
┌─────────────┐
│   Cursor    │
│ (Import &   │
│  Implement) │
└─────────────┘
```

---

## 💡 İpuçları

### 1. Claude Çıktısını Optimize Et

**İyi Format:**
```markdown
## Görev Başlığı

1. Adım 1
2. Adım 2

\`\`\`typescript
code
\`\`\`

⚠️ Not: Önemli bilgi
```

**Kötü Format:**
```markdown
Görev var
Adımlar:
- Adım 1
- Adım 2
```

### 2. File References Kullan

Claude'dan dosya referansları iste:
```
"Bu dosyayı göster: src/app/api/analysis/upload/route.ts"
```

Script otomatik olarak bulur ve plan'a ekler.

### 3. Verbose Mode Kullan

Detaylı log için:
```bash
node scripts/claude-cursor-bridge.js output.md --format=prompt --verbose
```

### 4. Output Dosyası Belirt

```bash
node scripts/claude-cursor-bridge.js output.md --format=todo --output=my-todos.json
```

---

## 🐛 Troubleshooting

### Problem: Script hiçbir şey bulamıyor

**Çözüm:**
- Claude çıktısının formatını kontrol et
- `--verbose` flag'i ile çalıştır
- Markdown formatının doğru olduğundan emin ol

### Problem: Todo list boş

**Çözüm:**
- Claude çıktısında `##` veya `###` başlıkları olduğundan emin ol
- Numaralı liste kullan (1., 2., 3.)

### Problem: File references bulunmuyor

**Çözüm:**
- Format: ````startLine:endLine:filepath` olmalı
- Code block içinde olmalı

---

## 🚀 İleri Seviye Kullanım

### Custom Format Ekle

`claude-cursor-bridge.js` dosyasını düzenle:

```javascript
function toCustomFormat(parsed) {
  // Custom format logic
  return customOutput;
}

// Switch case'e ekle
case 'custom':
  output = toCustomFormat(parsed);
  break;
```

### VS Code Task Olarak Ekle

`.vscode/tasks.json`:
```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "Claude → Todo",
      "type": "shell",
      "command": "node scripts/claude-cursor-bridge.js ${input:file} --format=todo --output=.workflow/todos.json",
      "problemMatcher": []
    }
  ],
  "inputs": [
    {
      "id": "file",
      "type": "promptString",
      "description": "Claude output file"
    }
  ]
}
```

---

## 📚 Örnek Dosyalar

Test için örnek dosyalar oluşturabilirsin:

```bash
# Test dosyası oluştur
cat > test-claude-output.md << 'EOF'
# Test Feature

## Implementation

1. İlk adım
2. İkinci adım

\`\`\`typescript
const test = "code";
\`\`\`

⚠️ Dikkat: Test notu
EOF

# Test et
node scripts/claude-cursor-bridge.js test-claude-output.md --format=prompt --verbose
```

---

*Bu workflow, Claude ve Cursor arasında sorunsuz bir köprü kurar! 🌉*

