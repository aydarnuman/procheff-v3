# 🎨 Claude-Cursor Workflow Görsel Kılavuz

*Adım adım görsel örnekler*

---

## 📊 Workflow Akış Diyagramı

```
┌─────────────────────────────────────────────────────────┐
│                   1. CLAUDE AI                          │
│                                                         │
│  Kullanıcı: "Yeni özellik ekle: Notification System"  │
│                                                         │
│  Claude: Markdown çıktı üretir                        │
│  - Görevler (## başlıklar)                             │
│  - Kod örnekleri (```code blocks)                      │
│  - Notlar (⚠️✅❌ emoji'ler)                           │
│  - Dosya referansları (```12:45:file.ts)              │
└───────────────────┬───────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────┐
│             2. ÇIKTI DOSYASI (Markdown)                │
│                                                         │
│  claude-output.md                                       │
│  ├── ## Görevler                                        │
│  ├── ## Kod Örnekleri                                   │
│  ├── ```typescript                                      │
│  └── ⚠️ Notlar                                          │
└───────────────────┬───────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────┐
│           3. SCRIPT ÇALIŞTIRMA                         │
│                                                         │
│  $ node scripts/claude-cursor-bridge.js \              │
│      claude-output.md --format=prompt                  │
│                                                         │
│  VEYA                                                   │
│                                                         │
│  $ node scripts/auto-workflow.js \                    │
│      claude-output.md                                  │
└───────────────────┬───────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────┐
│                 4. ÇIKTILAR                            │
│                                                         │
│  Format: prompt                                         │
│  └── Cursor prompt formatında markdown                 │
│                                                         │
│  Format: todo                                           │
│  └── todos.json (Cursor'a import edilebilir)          │
│                                                         │
│  Format: auto-workflow                                  │
│  ├── .workflow/todos.json                               │
│  ├── .workflow/plan.md                                  │
│  └── .workflow/summary.json                             │
└───────────────────┬───────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────┐
│             5. CURSOR IDE KULLANIMI                    │
│                                                         │
│  - Prompt'u Cursor'a yapıştır                          │
│  - Todo list'i import et                               │
│  - Plan'a göre implement et                            │
└─────────────────────────────────────────────────────────┘
```

---

## 🎯 Gerçek Örnek: Notification System

### Adım 1: Claude Çıktısı

**Dosya:** `examples/claude-output-example.md`

```markdown
# Notification System

## Plan
1. Component oluştur
2. WebSocket kur
3. API endpoint ekle

```typescript
export function NotificationCenter() {
  // code
}
```

```12:45:src/app/api/notifications/route.ts
export async function GET() {
  // code
}
```

⚠️ Dikkat: Rate limiting gerekli
```

### Adım 2: Script Çalıştır

```bash
node scripts/auto-workflow.js examples/claude-output-example.md
```

### Adım 3: Çıktılar

**`.workflow/todos.json`:**
```json
{
  "todos": [
    {
      "id": "step-1",
      "status": "pending",
      "content": "Component oluştur"
    },
    {
      "id": "step-2",
      "status": "pending",
      "content": "WebSocket kur"
    },
    {
      "id": "step-3",
      "status": "pending",
      "content": "API endpoint ekle"
    }
  ]
}
```

**`.workflow/plan.md`:**
```markdown
# Implementation Plan

## Özet
- 3 adım
- 1 dosya değişikliği
- Tahmini süre: 45 dakika

## Adımlar
1. Component oluştur
2. WebSocket kur
3. API endpoint ekle

## Dosyalar
- `src/app/api/notifications/route.ts` (12-45)
```

### Adım 4: Cursor'da Kullan

**Todo list'i import et:**
```typescript
// Cursor'da
const todos = require('.workflow/todos.json');
todo_write({ merge: false, todos: todos.todos });
```

**Plan'a göre implement et:**
- `.workflow/plan.md` dosyasını aç
- Her adımı tamamla
- Todo'ları `completed` yap

---

## 🔍 Parse Edilen Öğeler

### ✅ Bulunan Formatlar

| Format | Örnek | Bulunur? |
|--------|-------|----------|
| Task başlığı | `## Görev` | ✅ |
| Alt görev | `### Alt Görev` | ✅ |
| Code block | ` ```typescript` | ✅ |
| File reference | ` ```12:45:file.ts` | ✅ |
| Not (⚠️) | `⚠️ Dikkat: ...` | ✅ |
| Not (✅) | `✅ Öneri: ...` | ✅ |
| Numaralı adım | `1. İlk adım` | ✅ |
| Import statement | `import ... from '...'` | ✅ |

### ❌ Bulunmayan Formatlar

| Format | Örnek | Bulunmaz? |
|--------|-------|-----------|
| Ana başlık | `# Başlık` | ❌ (çok genel) |
| Escaped code | `\`\`\`` | ❌ |
| Alt madde | `  - Madde` | ❌ |
| Plain text path | `Dosya: src/file.ts` | ❌ |

---

## 💡 En İyi Pratikler

### 1. Claude Çıktısını Formatla

**✅ İyi:**
```markdown
## Implementation Plan

1. İlk adım
2. İkinci adım

```typescript
const code = "example";
```

⚠️ Dikkat: Önemli not
```

**❌ Kötü:**
```markdown
Plan var
- Adım 1
- Adım 2
code example
```

### 2. File References Kullan

**✅ İyi:**
```markdown
```12:45:src/app/api/route.ts
code here
```
```

**❌ Kötü:**
```markdown
Dosya: src/app/api/route.ts
```

### 3. Numaralı Liste Kullan

**✅ İyi:**
```markdown
1. İlk adım
2. İkinci adım
```

**❌ Kötü:**
```markdown
- İlk adım
- İkinci adım
```

---

## 🚀 Hızlı Test

```bash
# 1. Örnek dosyayı kullan
node scripts/auto-workflow.js examples/claude-output-example.md

# 2. Çıktıları kontrol et
cat .workflow/todos.json
cat .workflow/plan.md

# 3. Prompt formatına dönüştür
node scripts/claude-cursor-bridge.js examples/claude-output-example.md --format=prompt
```

---

## 📚 Daha Fazla Bilgi

- [`WORKFLOW-HOW-IT-WORKS.md`](./WORKFLOW-HOW-IT-WORKS.md) - Detaylı açıklama
- [`WORKFLOW-QUICK-START.md`](./WORKFLOW-QUICK-START.md) - Hızlı başlangıç
- [`Claude-Cursor-Workflow.md`](./Claude-Cursor-Workflow.md) - Ana workflow

---

*Workflow hazır ve çalışıyor! 🎉*

