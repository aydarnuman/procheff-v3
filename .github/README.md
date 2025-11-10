# 📋 Procheff-v3 Development Rules & Guidelines

Bu klasör, Procheff-v3 projesinin kod kurallarını ve AI asistan talimatlarını içerir.

## 📄 Dosyalar

### 1. `.clinerules` (1285 satır, 40KB)

**Amaç**: Cline AI (Claude) için detaylı proje kuralları

**İçerik:**

- Global development rules (TypeScript, React, AI, Database)
- **OCR Model Integration** (Gemini 2.0 Vision for low-density PDFs)
- Naming conventions (PascalCase, kebab-case, snake_case)
- AI integration patterns (provider usage, response handling, logging)
- Component patterns (client/server components)
- API route patterns (validation, error handling)
- Database patterns (SQLite queries)
- Validation patterns (Zod schemas)
- CI/CD rules (pre-commit, pre-deploy)
- Commit conventions
- Code review checklist
- Environment setup
- Dependencies list
- Key files reference
- **Functional Flow & Module Pipeline** (İhale Upload + OCR → Menü → Maliyet → Karar → Rapor)
- **Pipeline Stage 0: İhale Upload + OCR** [FAZ 6] (Gemini Vision, text density, SHA-256 hash)
- **AI-Specific File Map** (Tüm AI dosyalarının tablosu + ihale/upload endpoint)
- **OCR & Document Processing Patterns** (Gemini OCR, file detection, text extraction, caching)
- **Copilot Coding Practices** (Component yapısı, Tailwind, export patterns)
- **Enhanced Best Practices** (Dos and don'ts with examples)
- **Conventional Commits Examples** (feat/fix/refactor with scope)
- **AI Code Generation Context** (Kod yazma kontrol listesi)
- **AI Model Call Template** (Standard pattern with AILogger)
- **System Summary** (6 modules, observability, measurement)

**Kullanım:** Cline AI bu dosyayı otomatik okur ve kod yazarken kurallara uyar.

### 2. `.github/copilot-instructions.md` (999 satır, 29KB)

**Amaç**: GitHub Copilot için proje talimatları

**İçerik:**

- Project context (framework, tools, architecture)
- **OCR Layer** (Gemini 2.0 Vision for document extraction)
- Code style & patterns (TypeScript, React, API routes)
- AI integration examples
- Database access patterns
- Common patterns (error handling, loading states)
- Prompts & AI guidelines
- File naming conventions
- Import order
- Performance tips
- Common mistakes to avoid
- Module-specific guidelines
- Testing checklist
- **Functional Flow & Module Pipeline** (Stage 0: İhale Upload + OCR added)
- **Pipeline Stage 0: İhale Upload** [PHASE 6] (OCR trigger, Gemini Vision, file processing)
- **AI-Specific File Map** (Key files tablosu + /api/ihale/upload/route.ts)
- **OCR & Document Processing** (Smart OCR triggering, Gemini Vision, file type detection, text extraction, SHA-256 hashing, complete pipeline)
- **Coding Practices** (Component structure, styling, async/await)
- **Enhanced Best Practices** (What NOT to do vs. What TO do)
- **Conventional Commits Examples** (Detailed format with scope)
- **AI Code Generation Context** (Code writing checklist)
- **AI Model Call Template** (Standard pattern for every AI call)
- **System Summary** (Measurable, observable, self-aware AI system)

**Kullanım:** GitHub Copilot bu dosyayı okur ve kod önerilerinde kullanır.

## 🎯 Temel Kurallar Özeti

### TypeScript

- ✅ `any` kullanma
- ✅ Explicit types
- ✅ Zod validation
- ✅ Strict mode

### React & Next.js

- ✅ Hooks only
- ✅ PascalCase components
- ✅ "use client" directive
- ✅ Server components default

### AI Integration (Claude Sonnet 4.5)

- ✅ Centralized prompts (`src/lib/ai/prompts.ts`)
- ✅ AILogger for all operations
- ✅ cleanClaudeJSON for responses
- ✅ Error handling

### Database (SQLite)

- ✅ Singleton pattern (`getDB()`)
- ✅ Prepared statements
- ✅ snake_case table names

### API Routes

- ✅ Zod validation
- ✅ Try-catch all routes
- ✅ Structured responses
- ✅ AILogger integration

## 📐 Dizin Yapısı

```
src/
├── app/
│   ├── api/              # API routes
│   │   ├── ai/           # AI endpoints
│   │   ├── parser/       # File parsing
│   │   └── export/       # Report export
│   ├── cost-analysis/    # Cost analysis page
│   ├── decision/         # Decision engine page
│   ├── menu-parser/      # Menu parser page
│   ├── monitor/          # Monitoring dashboard
│   ├── reports/          # Report generation
│   └── logs/             # Log viewer
├── components/
│   ├── ui/               # Base UI components
│   └── analysis/         # Domain components
├── lib/
│   ├── ai/               # AI integration
│   │   ├── provider-factory.ts
│   │   ├── prompts.ts
│   │   ├── utils.ts
│   │   └── logger.ts
│   ├── db/               # Database
│   │   └── sqlite-client.ts
│   └── utils/            # Utilities
│       └── report-builder.ts
├── store/                # Zustand stores
└── types/                # TypeScript types
```

## 🔑 Anahtar Dosyalar

| Dosya                             | Amaç                            |
| --------------------------------- | ------------------------------- |
| `src/lib/ai/provider-factory.ts`  | Claude client singleton         |
| `src/lib/ai/prompts.ts`           | Centralized AI prompts          |
| `src/lib/ai/utils.ts`             | cleanClaudeJSON, estimateTokens |
| `src/lib/ai/logger.ts`            | AILogger class                  |
| `src/lib/db/sqlite-client.ts`     | Database connection             |
| `src/lib/utils/report-builder.ts` | Report data aggregation         |

## 🤖 AI Modül Rehberi

### Cost Analysis

- Prompt: `COST_ANALYSIS_PROMPT`
- Output: JSON with maliyet_dagilimi
- Endpoint: `/api/ai/cost-analysis`

### Decision Engine

- Prompt: `DECISION_PROMPT`
- Output: Katıl/Katılma/Dikkatli Katıl
- Endpoint: `/api/ai/decision`

### Menu Parser

- Prompt: `MENU_PARSER_PROMPT`
- Output: Array of menu items
- Endpoint: `/api/parser/menu`

### Report Export

- PDF: pdfkit
- Excel: exceljs
- Endpoints: `/api/export/pdf`, `/api/export/xlsx`

## 🧪 Kalite Kontrol

### Pre-Commit

```bash
npm run lint
npx tsc --noEmit
```

### Pre-Deploy

```bash
npm run build
npm test
```

### Manual Checks

- [ ] No `any` types
- [ ] No `console.log`
- [ ] All API routes validated with Zod
- [ ] All AI calls use AILogger
- [ ] Responsive design tested
- [ ] Error states handled

## 📚 Dokümantasyon

Proje kök dizininde detaylı modül dokümantasyonları:

- `AI-LOGGER-README.md` - Logger sistemi
- `MONITORING-DASHBOARD.md` - Monitoring dashboard
- `COST-ANALYSIS.md` - Maliyet analizi
- `DECISION-ENGINE.md` - Karar motoru
- `REPORT-EXPORT.md` - Rapor export sistemi

## 🔄 Güncelleme

Bu dosyaları güncellerken:

1. Her iki dosyayı (`clinerules` ve `copilot-instructions.md`) senkron tut
2. Yeni pattern eklendiğinde her ikisine de ekle
3. Versiyon numarasını güncelle
4. Tarih bilgisini güncelle

---

**Version**: 3.0.0  
**Last Updated**: November 10, 2025  
**AI Model**: Claude Sonnet 4.5 (claude-sonnet-4-20250514)  
**Framework**: Next.js 16.0.1 (App Router)  
**Status**: Production Ready
