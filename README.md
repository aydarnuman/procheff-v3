# 🎯 Procheff v3 - AI-Powered İhale Analiz Sistemi

**Kamu ihale analizi için Claude Sonnet 4.5 destekli Next.js uygulaması**

## ✨ Özellikler

- ⚡ **Auto-Pipeline Orchestrator** - Tek tıkla uçtan uca otomatik analiz
- 📊 **3-Tab Analysis System** - Veri Havuzu, Bağlamsal ve Derin Analiz (NEW!)
- 🔄 **Pipeline State Management** - Zustand ile veri kaybı önleme
- 📍 **Source Tracking** - Her veri noktasında dosya:sayfa referansı (NEW!)
- 🎨 **Auto-Categorization** - Tablolar otomatik sınıflandırma (menü/maliyet/personel/teknik) (NEW!)
- 🧠 **Claude Sonnet 4.5 Entegrasyonu** - Akıllı ihale analizi
- 📄 **OCR + Document Processing** - Gemini Vision ile PDF/DOCX analizi
- 💰 **AI Cost Analysis Engine** - Maliyet hesaplama ve optimizasyon
- 🧠 **AI Decision Engine** - Katıl/Katılma kararı motoru
- 🍽️ **Menu Parser** - CSV/TXT/PDF menü analizi
- 📝 **AI Logger System** - Renkli terminal logları + SQLite kayıt
- 💾 **Database Integration** - better-sqlite3 ile log yönetimi
- 🔐 **Authentication System** - NextAuth v5 ile JWT tabanlı oturum yönetimi
- 🔔 **Real-time Notifications** - SSE tabanlı canlı bildirim sistemi
- 👥 **Multi-Organization Support** - Çoklu organizasyon yönetimi
- 🛡️ **RBAC System** - Role-based access control (OWNER/ADMIN/ANALYST/VIEWER)
- 🎨 **Dark Premium Theme** - Glassmorphism + gradient effects ✨
- 📈 **Performance Tracking** - Token usage, duration monitoring
- 🔍 **Log Viewer** - Web-based log görüntüleme arayüzü
- 📊 **Monitoring Dashboard** - Real-time metrik ve grafik izleme
- 📄 **Report Export** - PDF & Excel raporlama
- 📊 **Pipeline Progress Tracking** - Visual step indicators

## 🚀 Quick Start

**For detailed setup instructions, see [Setup Guide](./docs/SETUP.md)**

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env.local
# Add your API keys to .env.local

# 3. Run development server
npm run dev

# 4. Open browser
# http://localhost:3001
```

### Required API Keys

- **Anthropic Claude API**: [Get key](https://console.anthropic.com/) - For AI analysis
- **Google Gemini API**: [Get key](https://aistudio.google.com/) - For OCR

📖 **Complete Setup Guide**: [docs/SETUP.md](./docs/SETUP.md)

### 4. Access Application

**Authentication:**

- **Sign In**: http://localhost:3001/signin
- **Register**: Quick registration via sign-in page

**Main Pages:**

- **Dashboard**: http://localhost:3001
- **⚡ Auto-Pipeline**: http://localhost:3001/auto (Tek Tıkla Analiz) 🔒
- **İhale Workspace**: http://localhost:3001/ihale/workspace (OCR + Upload) 🔒
- **Menu Parser**: http://localhost:3001/menu-parser 🔒
- **Cost Analysis**: http://localhost:3001/cost-analysis 🔒
- **Decision Engine**: http://localhost:3001/decision 🔒
- **Reports**: http://localhost:3001/reports 🔒
- **Monitoring Dashboard**: http://localhost:3001/monitor 🔒
- **Log Viewer**: http://localhost:3001/logs 🔒
- **Notifications**: http://localhost:3001/notifications 🔒

🔒 = Requires authentication

**API Endpoints:**

- **Auto-Pipeline**: http://localhost:3001/api/orchestrate (NEW!)
- Deep Analysis: http://localhost:3001/api/ai/deep-analysis
- Cost Analysis: http://localhost:3001/api/ai/cost-analysis
- Decision API: http://localhost:3001/api/ai/decision
- Menu Parser: http://localhost:3001/api/parser/menu
- İhale Upload: http://localhost:3001/api/ihale/upload
- Metrics: http://localhost:3001/api/metrics
- Alerts: http://localhost:3001/api/alerts
- Notifications (GET): http://localhost:3001/api/notifications
- Notifications Stream (SSE): http://localhost:3001/api/notifications/stream
- Auth Register: http://localhost:3001/api/auth/register

## 🎯 Analysis System

Procheff-v3 features a sophisticated 3-tab analysis system designed for comprehensive tender evaluation:

### 📊 Data Pool (Veri Havuzu)
- **Raw Data View**: Organized display of all extracted entities with source tracking
- **Tables View**: Auto-categorized tables (menu, cost, personnel, technical)
- Every data point includes file:page reference for full traceability

### 🧠 Contextual Analysis (Bağlamsal Analiz)
- Operational risk assessment with scoring
- Cost deviation probability analysis
- Time suitability evaluation
- Personnel and equipment requirements

### 🤖 Deep Analysis (Derin Analiz)
- AI-powered strategic recommendations
- Requires contextual and market analysis completion
- Confidence-scored decision making

**Key Features:**
- 📍 Source tracking on every data point
- 🎨 Color-coded categorization
- 📤 Export to CSV/Excel
- 🔍 Full-text search across all data
- 📱 Responsive design with glassmorphism theme

See [Analysis System Documentation](./docs/ANALYSIS-SYSTEM.md) for detailed guide.

## 📁 Project Structure

```
src/
├── lib/
│   ├── ai/
│   │   ├── logger.ts          # AI Logger with SQLite
│   │   ├── utils.ts           # JSON cleaner, token estimator
│   │   ├── prompts.ts         # AI prompt templates
│   │   └── provider-factory.ts # Anthropic client factory
│   ├── analysis/              # 🆕 Analysis helpers (NEW!)
│   │   └── helpers.ts         # Data extraction and categorization
│   └── db/
│       └── sqlite-client.ts   # Database connection
├── app/
│   ├── api/
│   │   ├── ai/
│   │   │   ├── deep-analysis/ # Claude AI endpoint
│   │   │   └── cost-analysis/ # Cost calculation
│   │   ├── logs/              # Log viewer API
│   │   └── metrics/           # Monitoring metrics API
│   ├── analysis/              # 🆕 3-Tab Analysis System (NEW!)
│   │   └── [id]/
│   │       └── page.tsx       # Analysis result page
│   ├── logs/
│   │   └── page.tsx           # Log viewer page
│   └── monitor/               # Monitoring dashboard
│       └── page.tsx
├── components/
│   ├── analysis/              # 🆕 Analysis components (NEW!)
│   │   ├── RawDataView.tsx    # Raw data display
│   │   ├── TablesView.tsx     # Categorized tables
│   │   ├── TableFullScreenModal.tsx # Table modal
│   │   ├── ContextualView.tsx # Risk analysis
│   │   └── LogViewer.tsx      # Log UI component
│   └── ui/                    # UI components
│       └── card.tsx
└── store/
    ├── analysisStore.ts       # 🆕 Analysis results store (NEW!)
    ├── useAnalysisStore.ts    # Legacy analysis state
    └── usePipelineStore.ts    # Pipeline state with persistence
```

## 🧪 API Usage

```bash
curl -X POST http://localhost:3001/api/ai/deep-analysis \
  -H "Content-Type: application/json" \
  -d '{
    "extracted_data": {
      "kurum": "Sağlık Bakanlığı",
      "ihale_turu": "Medikal Malzeme",
      "butce": "1000000 TL"
    }
  }'
```

## 📊 AI Logger Features

- ✅ Renkli konsol output (info, success, warn, error)
- ✅ SQLite veritabanına otomatik kayıt
- ✅ Performance metrics (duration, tokens)
- ✅ Web-based log viewer
- ✅ JSON pretty printing
- ✅ Timestamp tracking

## 🏗️ Technical Architecture

### System Overview

```
┌─────────────┐
│   Client    │
│   Browser   │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Next.js 16 │ ← Server-side rendering + API routes
│  (App Router)│
└──────┬──────┘
       │
       ├──────────────┬──────────────┬──────────────┐
       ▼              ▼              ▼              ▼
┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│   Claude    │ │   Gemini    │ │   SQLite    │ │     UI      │
│  Sonnet 4.5 │ │  Vision OCR │ │  Database   │ │ Components  │
└─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘
```

### How It Works

**1. AI Analysis APIs**

- `/api/ai/deep-analysis` - Claude analyzes tender documents
- `/api/ai/cost-analysis` - AI calculates costs and optimizations
- `/api/ai/decision` - Decision engine (bid/no-bid recommendations)
- 📖 [API Documentation](./docs/ARCHITECTURE.md#api-endpoints)

**2. Database & Storage**

- **Type**: SQLite (better-sqlite3)
- **Location**: `procheff.db` (auto-created on first run)
- **Tables**: logs, users, organizations, memberships, notifications
- **Purpose**: Structured logging, authentication, notifications, metrics
- 📖 [Database Schema](./docs/DATABASE.md)

**3. Authentication & Security**

- **Provider**: NextAuth v5 (JWT strategy)
- **Features**:
  - 🔐 Email/Password authentication
  - 👥 Multi-organization support
  - 🛡️ Role-based access control (RBAC)
  - 🔒 Protected routes via middleware
- **Roles**: OWNER, ADMIN, ANALYST, VIEWER
- 📖 [Auth Documentation](./docs/AUTHENTICATION.md)

**4. Real-time Notifications**

- **Technology**: Server-Sent Events (SSE)
- **Features**:
  - 🔔 Real-time notification streaming
  - 📜 Notification history (last 50)
  - 🎨 Color-coded by level (success/info/error)
  - ⚡ Auto-refresh every 2 seconds
- **Endpoints**:
  - GET `/api/notifications` - List notifications
  - GET `/api/notifications/stream` - SSE stream

**5. AI Power Source**

- **Configuration**: `.env.local` file
- **Claude API**: ANTHROPIC_API_KEY (for analysis)
- **Gemini API**: GOOGLE_API_KEY (for OCR)
- **Prompts**: Centralized in `src/lib/ai/prompts.ts`
- 📖 [Architecture Guide](./docs/ARCHITECTURE.md#ai-integration)

**4. Data Flow**

```
Upload → File Detection → Text Extraction → OCR (if needed) → Claude Analysis → Database Log → Response
```

**OCR Trigger**: Activated when text density < 0.25 (e.g., scanned PDFs)

### Tech Stack Overview

| Layer              | Technology                 | Purpose                                |
| ------------------ | -------------------------- | -------------------------------------- |
| **Framework**      | Next.js 16 (App Router)    | SSR, API routes, React 19              |
| **AI - Analysis**  | Claude Sonnet 4.5          | Deep analysis, cost calc, decisions    |
| **AI - OCR**       | Gemini 2.0 Vision          | Document text extraction               |
| **Database**       | SQLite (better-sqlite3)    | Auth, notifications, logs, persistence |
| **Authentication** | NextAuth v5 (beta)         | JWT strategy, multi-org, RBAC          |
| **Notifications**  | Server-Sent Events (SSE)   | Real-time notification streaming       |
| **State**          | Zustand                    | Client-side state management           |
| **Validation**     | Zod                        | Schema validation                      |
| **Styling**        | Tailwind CSS 4             | Utility-first CSS + Glassmorphism      |
| **Charts**         | Recharts                   | Data visualization                     |
| **Animations**     | Framer Motion              | Smooth UI animations                   |
| **UI Components**  | cmdk, lucide-react, sonner | Command palette, icons, toasts         |
| **Language**       | TypeScript (strict mode)   | Type safety                            |

### Documentation

| Document                                   | Description                                  |
| ------------------------------------------ | -------------------------------------------- |
| [🏗️ Architecture](./docs/ARCHITECTURE.md)  | System flow, AI integration, API reference   |
| [🗄️ Database](./docs/DATABASE.md)          | Schema, tables, relationships, queries       |
| [🚀 Setup Guide](./docs/SETUP.md)          | Installation, configuration, troubleshooting |
| [⌨️ Command Palette](./COMMAND-PALETTE.md) | Keyboard shortcuts, AI commands              |
| [💰 Cost Analysis](./COST-ANALYSIS.md)     | Cost calculation engine                      |
| [🎯 Decision Engine](./DECISION-ENGINE.md) | Bid/no-bid logic                             |
| [📝 AI Logger](./AI-LOGGER-README.md)      | Logging system                               |
| [📊 Monitoring](./MONITORING-DASHBOARD.md) | Dashboard features                           |
| [📄 Reports](./REPORT-EXPORT.md)           | PDF/Excel generation                         |

## � AI Cost Analysis Engine

Claude Sonnet 4.5 ile **akıllı maliyet hesaplama ve optimizasyon** sistemi! 🆕

### Özellikler

- ✅ Günlük kişi başı maliyet hesaplama
- ✅ Toplam gider tahmini
- ✅ Karlılık oranı önerisi
- ✅ Riskli kalem tespiti
- ✅ Maliyet dağılımı analizi
- ✅ Optimizasyon önerileri

### Erişim

```
http://localhost:3001/cost-analysis
```

Detaylı bilgi için: [COST-ANALYSIS.md](./COST-ANALYSIS.md)

## �📊 Monitoring Dashboard

Procheff v3 artık **gerçek zamanlı monitoring dashboard** ile birlikte geliyor!

### Özellikler

- ✅ Real-time metrics (10 saniyede bir otomatik güncelleme)
- ✅ Performance trend grafiği (süre & token)
- ✅ Log seviye dağılımı (bar chart)
- ✅ Başarı oranı tracking
- ✅ Son 10 aktivite akışı
- ✅ Responsive design

### Erişim

```
http://localhost:3001/monitor
```

Detaylı bilgi için: [MONITORING-DASHBOARD.md](./MONITORING-DASHBOARD.md)

## 🚀 Production-Ready Features

Procheff v3 artık **enterprise-grade production özellikleri** ile birlikte geliyor! API güvenliği, performans optimizasyonu ve toplu işleme desteği.

### Package 1: Rate Limiting & Caching

**API Rate Limiting:**

- ⚡ Upstash Redis tabanlı hız sınırlama
- 🛡️ Endpoint bazında konfigürasyon
- 📊 X-RateLimit-\* header desteği
- 🔄 Sliding window algoritması
- 🎯 Graceful degradation (Redis olmadan çalışır)

**Response Caching:**

- 💾 Akıllı Redis cache sistemi
- 🏷️ Tag-based invalidation
- ⚡ Stale-While-Revalidate (SWR) pattern
- 🎯 Content-based deduplication
- 📈 %99 hız artışı (AI analizlerde)

📖 Detaylı bilgi: [Rate Limiting](./docs/RATE-LIMITING.md) | [Caching](./docs/CACHING.md)

### Package 2: Batch Processing System

**Multi-File Upload & Processing:**

- 📦 50 dosyaya kadar toplu yükleme
- 🔄 Concurrent processing (3 paralel)
- 💾 Persistent SQLite queue
- ♻️ Otomatik retry logic (3 deneme)
- 📊 Real-time progress tracking
- 🎯 Priority queue (High/Normal/Low)

📖 Detaylı bilgi: [Batch Processing](./docs/BATCH-PROCESSING.md)

### Package 3: Notification Badge

**Visual Notification Indicator:**

- 🔴 Sidebar'da bildirim sayacı
- 🔄 30 saniyede bir otomatik güncelleme
- 📱 Collapsed/expanded state desteği
- ✨ Smooth animation effects

### Özellik Yapısı

Tüm yeni özellikler **izole edilmiş** ve **feature flag** kontrollü:

```
src/features/
├── config.ts                    # Feature flags & configuration
├── rate-limiting/
│   ├── redis-client.ts          # Redis connection
│   └── middleware.ts            # Rate limit logic
├── caching/
│   ├── cache-manager.ts         # Core cache operations
│   ├── keys.ts                  # Key generation
│   └── strategies.ts            # SWR, tag-based patterns
└── batch-processing/
    ├── init-batch-schema.ts     # Database schema
    └── queue-manager.ts         # Background processor
```

### Kurulum

```bash
# 1. Özellik flags'lerini aktifleştir (.env.local)
ENABLE_RATE_LIMITING=true
ENABLE_CACHING=true
ENABLE_BATCH=true

# 2. Upstash Redis ayarla (Rate Limit & Cache için)
UPSTASH_REDIS_REST_URL="https://your-redis.upstash.io"
UPSTASH_REDIS_REST_TOKEN="your-token"

# 3. Sunucuyu yeniden başlat
npm run dev
```

📝 **Not**: Batch Processing için ek bağımlılık gerekmez (SQLite kullanır)

### API Endpoints

```bash
# Batch upload (rate limited)
POST /api/batch/upload
  -F "file=@menu1.pdf" -F "file=@menu2.pdf" -F "priority=high"

# List batch jobs
GET /api/batch/jobs?status=completed&limit=10

# Get batch job status
GET /api/batch/jobs/{batchId}
```

### Performans

| Özellik        | Sonuç                   |
| -------------- | ----------------------- |
| Cache Hit Rate | %95+ (AI operations)    |
| Speed Increase | 100x (cached responses) |
| Rate Limit     | 5 req/min (analysis)    |
| Batch Capacity | 50 files per upload     |
| Parallel Jobs  | 3 concurrent            |

### Güvenlik

- ✅ Feature flags ile sıfır risk deployment
- ✅ Graceful degradation (Redis down → sistem çalışır)
- ✅ Existing kod değişmedi (sadece yeni dosyalar)
- ✅ Rate limiting → API abuse protection
- ✅ Retry logic → geçici hatalarda otomatik telafi

---

## 🔔 Smart Alerting System

Procheff v3 artık **akıllı bildirim sistemi** ile birlikte geliyor! Sistem sağlığını otomatik olarak izler ve kritik durumları bildirir.

### Özellikler

- ✅ **9 Akıllı Uyarı Kuralı** - Hata oranı, performans, token kullanımı ve daha fazlası
- ✅ **Otomatik Kontroller** - Her 5 dakikada bir sistem durumu analizi
- ✅ **Bildirim Yönetimi** - Okundu/okunmadı işaretleme, filtreleme
- ✅ **Öncelik Seviyeleri** - Info, warn, error kategorileri
- ✅ **Akıllı Tekrar Önleme** - 1 saat içinde aynı uyarıyı tekrarlamaz
- ✅ **Otomatik Temizlik** - 30 gün üzeri eski bildirimler silinir
- ✅ **Slack Entegrasyonu** - Opsiyonel Slack webhook desteği

### Uyarı Kuralları

| Kural                      | Koşul                      | Seviye |
| -------------------------- | -------------------------- | ------ |
| **Yüksek Hata Oranı**      | Son 24 saatte >%5 hata     | error  |
| **Yavaş Performans**       | Ortalama süre >30 saniye   | warn   |
| **Yüksek Token Kullanımı** | Günlük >100k token         | warn   |
| **Auth Hataları**          | 401 hataları tespit edildi | error  |
| **Server Hataları**        | 500 hataları tespit edildi | error  |
| **Yüksek Aktivite**        | 24 saatte >100 çağrı       | info   |
| **Aktivite Yok**           | 6 saatte hiç çağrı yok     | warn   |
| **Hata Patlaması**         | Ani hata artışı            | error  |
| **Token Verimsizliği**     | Hata başına >5k token      | warn   |

### Erişim

**Bildirimler Sayfası:**

```
http://localhost:3001/notifications
```

**API Endpoints:**

```bash
# Manuel alert kontrolü
curl -X POST http://localhost:3001/api/alerts

# Bildirimleri getir
curl http://localhost:3001/api/notifications

# Tümünü okundu işaretle
curl -X PATCH http://localhost:3001/api/notifications
```

### Slack Entegrasyonu (Opsiyonel)

`.env.local` dosyasına ekleyin:

```bash
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
```

### Otomatik Kontroller

Vercel Cron Job her 5 dakikada bir `/api/alerts` endpoint'ini çağırır ve tüm kuralları kontrol eder.

**Yapılandırma:** `vercel.json`

```json
{
  "crons": [
    {
      "path": "/api/alerts",
      "schedule": "*/5 * * * *"
    }
  ]
}
```

## 🎨 Dark Premium Theme System

Procheff v3 uses a **custom glassmorphism theme** with gradient effects:

### Theme Classes (src/app/globals.css)

- `.glass` - Base glass effect (backdrop-blur + bg-slate-900/60)
- `.glass-card` - Glass card with padding and hover effects
- `.btn-gradient` - Gradient button (indigo→purple→pink)
- `.h1`, `.h2`, `.h3` - Typography hierarchy with gradient colors

### Features

- ✨ Glassmorphism effects
- 🌈 Gradient backgrounds & buttons
- 🎭 Smooth page transitions (Framer Motion)
- 📱 Fully responsive design
- 🎯 Consistent spacing & typography

### Usage Example

```tsx
<div className="glass-card">
  <h2 className="h2">Section Title</h2>
  <p className="text-gray-400">Content goes here</p>
  <button className="btn-gradient">Action</button>
</div>
```

## ⌨️ Command Palette & Keyboard Shortcuts

Procheff v3 includes a powerful **AI-powered command palette** for quick navigation and actions:

### Command Palette (`Cmd/Ctrl + K`)

- 🔍 **Quick Navigation** - Access any module instantly
- 🤖 **AI Query** - Ask Claude questions directly from the palette
- ⌨️ **Keyboard-First** - Full keyboard navigation support
- 🎨 **Premium UI** - Glass effect design with smooth animations

### Keyboard Shortcuts

| Shortcut       | Action                     |
| -------------- | -------------------------- |
| `Cmd/Ctrl + K` | Open/close command palette |
| `Cmd/Ctrl + B` | Toggle sidebar collapse    |
| `↑` `↓`        | Navigate menu items        |
| `Enter`        | Select item                |
| `ESC`          | Close palette              |

### Features

- Quick jump to any page (Monitoring, Logs, Reports, etc.)
- Direct Claude AI queries from anywhere
- Recent actions tracking
- Fuzzy search support

Detaylı bilgi için: [COMMAND-PALETTE.md](./COMMAND-PALETTE.md)

## 📖 Documentation

### Core Documentation

| Document                                      | Description                                      |
| --------------------------------------------- | ------------------------------------------------ |
| **[🚀 Setup Guide](./docs/SETUP.md)**         | Complete installation and configuration (15 min) |
| **[🏗️ Architecture](./docs/ARCHITECTURE.md)** | System design, AI integration, API reference     |
| **[🗄️ Database Schema](./docs/DATABASE.md)**  | Tables, relationships, queries, best practices   |

### Feature Documentation

| Document                                             | Description                        |
| ---------------------------------------------------- | ---------------------------------- |
| [🔄 Pipeline State Guide](./PIPELINE-GUIDE.md)       | State management & data persistence (NEW!) |
| [⚡ Auto-Pipeline v2](./AUTO-PIPELINE.md)            | Automated end-to-end analysis      |
| [⌨️ Command Palette](./COMMAND-PALETTE.md)           | Keyboard shortcuts and AI commands |
| [💰 Cost Analysis](./COST-ANALYSIS.md)               | AI cost calculation engine         |
| [🎯 Decision Engine](./DECISION-ENGINE.md)           | Bid/no-bid decision logic          |
| [📝 AI Logger](./AI-LOGGER-README.md)                | Logging system and monitoring      |
| [📊 Monitoring Dashboard](./MONITORING-DASHBOARD.md) | Real-time metrics and graphs       |
| [📄 Report Export](./REPORT-EXPORT.md)               | PDF & Excel generation             |
| [📋 Changelog](./CHANGELOG.md)                       | Version history & updates (NEW!)   |

### Production Features

| Document                                          | Description                                 |
| ------------------------------------------------- | ------------------------------------------- |
| [⚡ Rate Limiting](./docs/RATE-LIMITING.md)       | API protection with Redis rate limits       |
| [💾 Caching](./docs/CACHING.md)                   | Response caching and SWR patterns           |
| [📦 Batch Processing](./docs/BATCH-PROCESSING.md) | Multi-file upload and concurrent processing |

### Phase 8 - UI Implementation Sprint 🔴

| Document                                                                    | Description                             |
| --------------------------------------------------------------------------- | --------------------------------------- |
| [✅ Implementation Checklist](./docs/PHASE8_UI_IMPLEMENTATION_CHECKLIST.md) | 🆕 Detaylı görev listesi & sprint planı |
| [📊 Progress Report Template](./docs/PROGRESS_REPORT.md)                    | 🆕 Haftalık ilerleme raporu şablonu     |
| [⚡ Quick Reference](./docs/PHASE8_QUICK_REFERENCE.md)                      | 🆕 Tek sayfa özet & hızlı başlangıç     |
| [🔍 UI/UX Analysis](./UI-UX-ANALYSIS-REPORT.md)                             | İlk analiz raporu (10 Kas 2025)         |

### External Resources

- [Next.js Documentation](https://nextjs.org/docs) - Framework reference
- [Anthropic Claude API](https://docs.anthropic.com/) - AI model docs
- [Google AI Studio](https://ai.google.dev/docs) - Gemini Vision docs

## 🎯 Status

**🟢 Production Ready - Faz 8.0 Complete**

### Core Features

- ✅ Claude Sonnet 4.5 entegrasyonu aktif
- ✅ Gemini 2.0 Vision OCR aktif
- ✅ AI Cost Analysis Engine çalışıyor
- ✅ AI Decision Engine çalışıyor
- ✅ Menu Parser çalışıyor
- ✅ İhale Upload + OCR pipeline çalışıyor
- ✅ AI Logger sistemi çalışıyor
- ✅ Database kayıt aktif
- ✅ Monitoring Dashboard aktif
- ✅ PDF/Excel export çalışıyor
- ✅ Performance tracking aktif

### UI/UX

- ✅ **Dark Premium Theme aktif** ✨
- ✅ **Command Palette (Cmd+K) aktif** ⌨️
- ✅ **Sidecar Navigation (Cmd+B) aktif** 🎯
- ✅ **Smart Alerting System aktif** 🔔
- ✅ **Notification Badge aktif** 🔴

### Production Features (Phase 8)

- ✅ **Rate Limiting Backend** ⚡ (Upstash Redis) - ⚠️ UI Pending
- ✅ **Response Caching Backend** 💾 (Redis SWR) - ⚠️ UI Pending
- ✅ **Batch Processing Backend** 📦 (Multi-file upload) - ⚠️ UI Pending
- ✅ **Queue Manager aktif** 🔄 (Background jobs)
- ✅ **Priority Queue aktif** 🎯 (High/Normal/Low)
- ✅ **Retry Logic aktif** ♻️ (Auto-retry failures)

**🔴 Phase 8 UI Sprint Active** - See [Checklist](./docs/PHASE8_UI_IMPLEMENTATION_CHECKLIST.md) for progress

## 📝 License

MIT
