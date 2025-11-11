# 🧠 Claude Code Instructions for Procheff-v3

## 🎯 Project Overview

**Procheff-v3** is an AI-driven public procurement analysis and decision support system built with Next.js 16, TypeScript, and Claude Sonnet 4.5.

### Core Mission
Analyze public procurement tenders, calculate costs, assess risks, and provide strategic participation decisions for catering companies.

## 🏗️ Architecture Overview

```
┌──────────────────┐    ┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐    ┌──────────────┐
│ 0. İhale Upload  │ -> │  1. Menu Parser │ -> │ 2. Cost Analysis │ -> │ 3. Decision Eng │ -> │ 4. Reporting │
│ (OCR + Extract)  │    │   (File Upload) │    │   (AI Calculate) │    │   (AI Decide)   │    │  (PDF/Excel) │
└──────────────────┘    └─────────────────┘    └──────────────────┘    └─────────────────┘    └──────────────┘
```

## 📊 Technology Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript (strict mode)
- **AI Model**: Claude Sonnet 4.5 (claude-sonnet-4-20250514)
- **OCR**: Gemini 2.0 Vision (Google Generative AI)
- **Web Scraping**: Playwright + Cheerio (ihalebul.com integration)
- **Database**: SQLite (better-sqlite3)
- **Cache**: Upstash Redis
- **Authentication**: NextAuth v5 (JWT + RBAC)
- **Styling**: Tailwind CSS 4 (Glassmorphism theme)
- **State**: Zustand
- **Charts**: Recharts
- **Export**: pdfkit, exceljs

## 🔑 Key Files You Should Know

### AI & Processing
```
src/lib/ai/
├── prompts.ts           # All Claude prompt templates
├── utils.ts            # cleanClaudeJSON, estimateTokens
├── logger.ts           # AILogger implementation
└── provider-factory.ts # Claude client singleton

src/app/api/
├── ihale/
│   ├── upload/         # Tender document upload + OCR
│   ├── login/          # İhalebul.com login proxy
│   ├── list/           # İhalebul.com tender list
│   └── detail/[id]/    # İhalebul.com tender detail
├── ai/cost-analysis/   # Cost calculation endpoint
├── ai/decision/        # Decision engine endpoint
└── parser/menu/        # Menu file parser
```

### İhalebul Worker (Port 8080)
```
ihale-worker/
├── src/
│   ├── ihalebul.ts     # Playwright scraper + parser (CRITICAL!)
│   ├── server.ts       # Express server
│   └── utils/
│       └── exporters.ts # CSV/JSON/TXT export utilities
└── package.json        # Playwright + json2csv dependencies
```

**Endpoints:**
- `POST /auth/login` - İhalebul.com authentication
- `GET /list?sessionId=xxx` - Fetch all tender pages (with pagination)
- `GET /detail/:id?sessionId=xxx` - Get tender detail (with SPA spinner handling)
- `GET /export?sessionId=xxx&format=csv|json|txt` - Export tenders in multiple formats
- `GET /proxy?sessionId=xxx&url=xxx` - Proxy document downloads
- `GET /health` - Health check

### Authentication & Security
```
src/lib/auth.ts         # NextAuth v5 configuration
src/lib/rbac.ts         # Role-based access control
middleware.ts           # Route protection
```

### Database & Logging
```
src/lib/db/
├── sqlite-client.ts    # Database singleton
├── init-auth.ts        # Auth + notifications schema
└── schema.sql          # Database schema

src/lib/utils/logging.py # Python logging utility
```

### UI & Components
```
src/app/globals.css     # Glassmorphism theme system
src/components/
├── ui/                 # Base UI components
│   ├── PipelineProgress.tsx # Pipeline progress indicator
│   ├── LoadingState.tsx     # Unified loading component
│   ├── ErrorState.tsx       # Unified error component
│   └── EmptyState.tsx       # Empty state with actions
└── shell/              # Navigation, user menu
```

### Analysis System ⭐ NEW!
```
src/lib/analysis/
└── helpers.ts          # Data extraction and categorization utilities

src/components/analysis/
├── RawDataView.tsx     # Organized raw data display with source refs
├── TablesView.tsx      # Categorized table viewer with export
├── TableFullScreenModal.tsx # Advanced table viewer (20-row pagination)
└── ContextualView.tsx  # Risk and opportunity visualization

src/app/analysis/[id]/
└── page.tsx           # 3-tab analysis result page (simplified from 5)
```

### State Management ⭐ NEW!
```
src/store/
├── analysisStore.ts    # Analysis results management
├── useAnalysisStore.ts # Legacy analysis state
└── usePipelineStore.ts # Centralized pipeline state (Zustand + persist)
```

## 🎨 Theme System (globals.css)

```css
.glass          # backdrop-blur + bg-slate-900/60
.glass-card     # glass + padding + hover
.btn-gradient   # indigo→purple→pink gradient
.h1, .h2, .h3   # Typography hierarchy
```

## 🧩 Core Modules & APIs

### 1. İhale Upload (Phase 6 - NEW!)
**Endpoint**: `/api/ihale/upload`
- Upload tender documents (PDF/DOCX/TXT)
- Smart OCR triggering (text density < 25%)
- Gemini 2.0 Vision for low-density PDFs
- Claude analysis with structured output

### 2. Menu Parser
**Endpoint**: `/api/parser/menu`
- Parse CSV/TXT/PDF menu files
- Extract food items, portions, categories
- Returns structured menu data

### 3. Cost Analysis
**Endpoint**: `/api/ai/cost-analysis`
- Input: menu data + tender info
- Claude calculates costs, risks, profit margins
- Returns financial breakdown

### 4. Decision Engine
**Endpoint**: `/api/ai/decision`
- Strategic decision: Katıl/Katılma/Dikkatli Katıl
- Risk assessment and recommendations
- Confidence scoring

### 5. Report Export
**Endpoints**: `/api/export/pdf`, `/api/export/xlsx`
- Professional PDF/Excel reports
- Combines all pipeline data
- Downloadable formatted outputs

## 🔍 Monitoring & Observability

### AILogger Usage
```typescript
import { AILogger } from "@/lib/ai/logger";

AILogger.info("Operation started", { context });
AILogger.success("AI analysis completed", { tokens, duration });
AILogger.error("Operation failed", { error });
```

### Metrics Dashboard
- **URL**: `/monitor`
- Real-time API metrics
- Token usage tracking
- Performance visualization (Recharts)
- System health indicators

## 🛡️ Authentication & Authorization

### Current Setup
- **NextAuth v5** with JWT strategy
- **Multi-organization** support
- **Role-based access**: OWNER, ADMIN, ANALYST, VIEWER
- **Protected routes** via middleware

### User Management
```typescript
// Check user permissions
import { hasPermission } from "@/lib/rbac";

const canAnalyze = hasPermission(user.role, "ANALYZE");
```

## 🎯 Coding Standards

### TypeScript Patterns
```typescript
// ✅ DO: Explicit types, no 'any'
interface AnalysisRequest {
  kurum: string;
  ihale_turu: string;
  kisilik: number;
}

// ✅ DO: Validate with Zod
const RequestSchema = z.object({
  field: z.string().min(1),
});
```

### AI Integration Pattern
```typescript
import { AIProviderFactory } from "@/lib/ai/provider-factory";
import { cleanClaudeJSON } from "@/lib/ai/utils";

const client = AIProviderFactory.getClaude();
const result = await client.messages.create({
  model: process.env.ANTHROPIC_MODEL!,
  temperature: 0.4,
  max_tokens: 8000,
  messages: [{ role: "user", content: prompt }],
});

const text = cleanClaudeJSON(result.content?.[0]?.text || "");
const data = JSON.parse(text);
```

### Database Queries
```typescript
import { getDB } from "@/lib/db/sqlite-client";

const db = getDB();
const stmt = db.prepare("SELECT * FROM logs WHERE id = ?");
const row = stmt.get(logId);
```

## 🚀 Common Tasks

### Adding New AI Endpoint
1. Create route in `src/app/api/ai/[feature]/route.ts`
2. Add prompt to `src/lib/ai/prompts.ts`
3. Use AILogger for tracking
4. Validate input with Zod
5. Clean Claude response with `cleanClaudeJSON()`

### Adding UI Page
1. Create in `src/app/[page]/page.tsx`
2. Use glassmorphism theme classes
3. Add to navigation in `src/components/shell/Sidecar.tsx`
4. Implement loading/error states

### Database Schema Changes
1. Update `src/lib/db/schema.sql`
2. Add migration logic in `src/lib/db/migrations/`
3. Update TypeScript types

## 🧪 Development Workflow

### Running the App
```bash
npm run dev          # Development server
npm run build        # Production build
npm run lint         # ESLint check
npx tsc --noEmit     # TypeScript check
```

### Testing AI Features
```bash
# Test API endpoints
curl -X POST http://localhost:3000/api/ai/cost-analysis \
  -H "Content-Type: application/json" \
  -d '{"menu_data": [...], "kurum": "test"}'
```

## 📝 Best Practices

### Error Handling
```typescript
try {
  await operation();
  AILogger.success("Success");
} catch (error) {
  const message = error instanceof Error ? error.message : "Unknown error";
  AILogger.error("Failed", { error: message });
  return NextResponse.json({ error: message }, { status: 500 });
}
```

### Component Structure
```typescript
interface Props {
  title: string;
  onSubmit: (data: FormData) => void;
}

export default function Component({ title, onSubmit }: Props) {
  const [loading, setLoading] = useState(false);
  
  return (
    <div className="glass-card">
      <h3 className="h3">{title}</h3>
      {/* Component content */}
    </div>
  );
}
```

## 🎮 Context for Claude

When working on this project:

1. **Always use AILogger** instead of console.log
2. **Validate inputs** with Zod schemas
3. **Clean Claude responses** with cleanClaudeJSON()
4. **Use glassmorphism theme** classes for UI
5. **Log AI operations** for metrics dashboard
6. **Follow modular pipeline** architecture
7. **Maintain TypeScript strict mode** compatibility

## 🔧 Environment Variables

```env
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-sonnet-4-20250514
GOOGLE_API_KEY=AIza...
UPSTASH_REDIS_REST_URL=...
NEXTAUTH_SECRET=...
DATABASE_URL=./procheff.db
```

## 📚 Documentation

- **Architecture**: `docs/ARCHITECTURE.md`
- **Deployment**: `docs/DIGITALOCEAN-DEPLOYMENT.md`
- **Analysis System**: `docs/ANALYSIS-SYSTEM.md` ⭐ NEW!
- **AI Logger**: `AI-LOGGER-README.md`
- **Python Logging**: `PYTHON-LOGGING.md`
- **İhalebul Integration**: `docs/IHALEBUL-INTEGRATION.md`
- **İhalebul Quick Start**: `IHALEBUL-QUICKSTART.md`
- **Pipeline State Guide**: `PIPELINE-GUIDE.md`
- **Changelog**: `CHANGELOG.md`

## 🎯 Current Status

- ✅ **Core Pipeline**: Upload → Parse → Analyze → Decide → Report
- ✅ **3-Tab Analysis System**: Veri Havuzu → Bağlamsal Analiz → Derin Analiz ⭐ NEW!
- ✅ **Enhanced Data Organization**: Categorized tables with source tracking ⭐ NEW!
- ✅ **Advanced Table Viewer**: Full-screen modal with search, sort, pagination ⭐ NEW!
- ✅ **Pipeline State Management**: Zustand store with localStorage persistence
- ✅ **Data Loss Prevention**: Automatic data transfer between pipeline steps
- ✅ **UI Consistency**: Unified loading, error, and empty state components
- ✅ **Authentication**: NextAuth v5 with RBAC
- ✅ **Monitoring**: Real-time metrics dashboard
- ✅ **OCR Integration**: Gemini 2.0 Vision for PDFs
- ✅ **Export System**: PDF/Excel report generation
- ✅ **Python Logging**: Cross-language logging utility
- ✅ **İhalebul Integration**: Automated tender scraping (Playwright + Cheerio)
- ✅ **Tender Export System**: CSV/JSON/TXT export with beautiful formatting
- ✅ **SPA Spinner Handling**: Network monitoring + smart content waiting
- ✅ **Database Caching**: SQLite-backed tender persistence for fast page loads

## 🆕 Latest Features (11 Kasım 2025)

### 📊 3-Tab Analysis Structure ⭐ NEW!

**Simplified from 5 tabs to 3 tabs for better UX:**

1. **📊 Veri Havuzu Tab** (Data Pool)
   - **Ham Veri Sub-tab**:
     - Temel bilgiler kartları (kurum, bütçe, kişi sayısı)
     - Kronolojik tarih timeline
     - Dokümanlara göre metin gruplandırma
     - Tespit edilen detaylar (lokasyon, yetkili, özel şartlar)
   - **Tablolar Sub-tab**:
     - Otomatik kategorizasyon (menü/yeşil, maliyet/mavi, personel/mor, teknik/turuncu)
     - Excel'e export ve kopyalama
     - Tam ekran görüntüleme modalı

2. **🧠 Bağlamsal Analiz Tab** (Contextual Analysis)
   - Operasyonel risk değerlendirmesi
   - Maliyet sapma olasılığı
   - Zaman uygunluğu analizi
   - Personel gereksinimi
   - Ekipman ihtiyacı

3. **🤖 Derin Analiz Tab** (Deep Analysis)
   - Ön koşul kontrolü (bağlamsal + piyasa analizi gerekli)
   - AI danışman stratejik öneriler
   - Güven skorlu karar verme

### 🔧 New Analysis Components

```typescript
// Helper Functions
src/lib/analysis/helpers.ts
- extractBasicInfo()      // Temel bilgileri çıkarır
- extractCriticalDates()  // Tarihleri kronolojik sıralar
- groupByDocument()       // Metinleri dokümana göre gruplar
- extractDetails()        // Lokasyon, yetkili, şartları tespit eder
- categorizeAllTables()   // Tabloları otomatik sınıflandırır

// View Components
src/components/analysis/
├── RawDataView.tsx           // Ham veri organizasyonu (kaynak referanslı)
├── TablesView.tsx            // Kategorize tablo görüntüleyici
├── TableFullScreenModal.tsx  // 20 satırlık sayfalama ile modal
└── ContextualView.tsx        // Risk ve fırsat analizi
```

### 🔄 Pipeline State Management
Centralized state management prevents data loss between pipeline steps:

**Store Structure:**
```typescript
interface PipelineState {
  // Current step tracking
  currentStep: PipelineStep;
  completedSteps: PipelineStep[];

  // Pipeline data
  selectedTender: Tender | null;
  menuData: MenuItem[] | null;
  costAnalysis: CostAnalysisResult | null;
  decision: DecisionResult | null;

  // Actions
  startNewPipeline: (tender: Tender) => void;
  updateMenuData: (data: MenuItem[]) => void;
  updateCostAnalysis: (analysis: CostAnalysisResult) => void;
  updateDecision: (decision: DecisionResult) => void;
  resetPipeline: () => void;
}
```

**Features:**
- **Automatic data persistence** with localStorage
- **Cross-page data sharing** without prop drilling
- **Progress tracking** with visual indicators
- **One-click pipeline reset** for new analysis

**Usage:**
```typescript
import { usePipelineStore } from "@/store/usePipelineStore";

// In any component
const { selectedTender, menuData, updateCostAnalysis } = usePipelineStore();
```

### 📦 Multi-Format Tender Export
Export all tenders in three formats:
- **CSV**: Excel-compatible with UTF-8 BOM, perfect for data analysis
- **JSON**: Structured data with metadata (count, date, source)
- **TXT**: Human-readable report format with emojis and formatting

**Usage:**
```typescript
// Frontend: /ihale page
<button onClick={() => handleExport('csv')}>Export CSV</button>

// Backend: GET /export?sessionId=xxx&format=csv
```

### 🔄 SPA Spinner Problem Solution
İhalebul.com uses SPA architecture with loading spinners. We solved this with:

**Network Monitoring:**
```typescript
page.on('request', request => {
  if (request.resourceType() === 'xhr' || request.resourceType() === 'fetch') {
    apiRequests.push(url); // Track XHR/Fetch calls
  }
});
```

**Smart Content Waiting:**
```typescript
await page.waitForFunction(`() => {
  const tender = document.querySelector('#tender, .tender-content, main.tender-detail');
  return tender && tender.textContent && tender.textContent.length > 200;
}`, { timeout: 15000 });
```

### 💾 Database Caching Strategy
```
1️⃣ First Load: Database (fast ⚡) → If empty → Worker (slow 🌐) → Save to DB
2️⃣ Page Refresh: Database (instant 💾)
3️⃣ "Yenile" Button: Worker (fresh data 🌐) → Update DB
```

---

**AI Model**: Claude Sonnet 4.5 (claude-sonnet-4-20250514)
**Last Updated**: 11 Kasım 2025
**Status**: ✅ Production Ready with Enhanced Pipeline Management
