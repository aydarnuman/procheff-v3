# ⚡ Workflow Hızlı Başlangıç

*5 dakikada başla!*

---

## 🚀 3 Adımda Başla

### 1️⃣ Claude'dan Çıktı Al

Claude'a görev ver ve çıktıyı bir dosyaya kaydet:

```bash
# Örnek: Claude çıktısını dosyaya kaydet
cat > my-task.md << 'EOF'
# Yeni Özellik

## Plan

1. İlk adım
2. İkinci adım

\`\`\`typescript
const code = "example";
\`\`\`
EOF
```

### 2️⃣ Script'i Çalıştır

```bash
# Todo list oluştur
node scripts/auto-workflow.js my-task.md
```

### 3️⃣ Çıktıları Kullan

**Todo list'i Cursor'da kullan:**
```typescript
// Cursor'da
const todos = require('.workflow/todos.json');
todo_write({ merge: false, todos: todos.todos });
```

**Plan'a göre implement et:**
```bash
cat .workflow/plan.md
```

---

## 📋 Örnek Senaryolar

### Senaryo A: Yeni Feature

```bash
# 1. Claude çıktısını kaydet
# 2. Plan oluştur
node scripts/auto-workflow.js feature.md

# 3. Todo'ları import et ve başla
```

### Senaryo B: Bug Fix

```bash
# 1. Claude çıktısını kaydet
# 2. Prompt formatına dönüştür
node scripts/claude-cursor-bridge.js bug-fix.md --format=prompt > fix-prompt.md

# 3. Cursor'da fix-prompt.md'yi kullan
```

### Senaryo C: Refactoring

```bash
# 1. Claude çıktısını kaydet
# 2. Detaylı plan oluştur
node scripts/auto-workflow.js refactor.md

# 3. Plan.md'yi takip et
```

---

## 🎯 Çıktı Formatları

### Todo List (JSON)
```json
{
  "todos": [
    {
      "id": "step-1",
      "status": "pending",
      "content": "Task description"
    }
  ]
}
```

### Implementation Plan (Markdown)
```markdown
# Implementation Plan

## Özet
- X adım
- Y dosya
- Z dependency

## Adımlar
1. Step 1
2. Step 2
```

### Summary (JSON)
```json
{
  "totalSteps": 4,
  "filesToModify": 2,
  "estimatedTime": "60 dakika"
}
```

---

## 💡 İpuçları

1. **Claude çıktısını formatla:**
   - `##` veya `###` başlıklar kullan
   - Numaralı liste kullan (1., 2., 3.)
   - Code block'ları ` ```language` ile başlat

2. **File references ekle:**
   - Format: ````12:45:src/file.ts`
   - Script otomatik bulur

3. **Verbose mode:**
   ```bash
   node scripts/claude-cursor-bridge.js output.md --verbose
   ```

---

## 🔗 Daha Fazla Bilgi

- [`WORKFLOW-HOW-IT-WORKS.md`](./WORKFLOW-HOW-IT-WORKS.md) - Detaylı açıklama
- [`Claude-Cursor-Workflow.md`](./Claude-Cursor-Workflow.md) - Ana workflow
- [`README-WORKFLOW.md`](../README-WORKFLOW.md) - Quick start guide

---

*Hazır! Başlayabilirsin! 🎉*

