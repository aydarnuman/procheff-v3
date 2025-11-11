# Changelog

All notable changes to Procheff-v3 will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [3.5.1] - 2025-11-11

### 🧹 Project Cleanup & Documentation

#### Removed
- Deprecated `MarketView.tsx` component (unused in 3-tab system)
- 10 duplicate deployment documentation files consolidated into one:
  - `DIGITALOCEAN-SETUP.md`
  - `DEPLOY-NOW.md`
  - `DEPLOYMENT-READY.md`
  - `DEPLOYMENT-SUMMARY.md`
  - `QUICK-DEPLOY-CHECKLIST.md`
  - `README-DEPLOYMENT.md`
  - `docs/DEPLOYMENT-NOTES.md`
  - `docs/DEPLOYMENT.md`
  - `docs/DIGITALOCEAN-DEPLOY.md`
  - `docs/QUICK-DEPLOY.md`

#### Changed
- Consolidated all deployment docs into `docs/DIGITALOCEAN-DEPLOYMENT.md`
- Updated documentation to reflect removal of MarketView
- Store file descriptions clarified in README and CLAUDE.md

#### Documentation
- Updated README.md project structure
- Updated CLAUDE.md to remove MarketView references
- Fixed deployment documentation links
- Added clarity to store file purposes

## [3.5.0] - 2025-11-11

### 🎯 Major: 3-Tab Analysis System

#### Added
- **3-Tab Structure** replacing previous 5-tab system
  - `Veri Havuzu`: Dual sub-tabs for raw data and tables
  - `Bağlamsal Analiz`: Integrated risk assessment
  - `Derin Analiz`: Strategic AI recommendations with prerequisites

- **Data Organization Components**
  - `RawDataView`: Smart entity grouping with source tracking (file:page)
  - `TablesView`: Auto-categorization into menu/cost/personnel/technical
  - `TableFullScreenModal`: Professional table viewer with pagination
  - Helper utilities for data extraction and categorization

- **Enhanced Features**
  - Every data point shows source reference
  - Logical grouping of related information
  - Table categorization with color coding
  - CSV/Excel export capabilities
  - Full-text search across all data

#### Changed
- Reduced analysis tabs from 5 to 3 for improved UX
- `ContextualTab` now accepts `dataPool` parameter
- `DeepTab` shows prerequisites and accepts all analysis params
- Unified data flow through centralized store

#### Removed
- `MarketTab` component (merged into contextual)
- `DecisionTab` component (merged into deep analysis)
- Redundant data passing between components

### Performance
- Reduced context size by ~30% with 3-tab structure
- Faster navigation with sub-tabs instead of main tabs
- Improved data organization reduces cognitive load

## [3.1.0] - 2025-11-11

### Added
- 🔄 **Pipeline State Management System**
  - Centralized state management using Zustand with localStorage persistence
  - Automatic data transfer between pipeline steps
  - Cross-page data sharing without prop drilling
  - `usePipelineStore` hook for accessing pipeline data

- 📊 **Visual Pipeline Progress Indicator**
  - `PipelineProgress` component showing current and completed steps
  - Animated progress bar with step icons
  - Visual feedback for user's position in the workflow

- 🎨 **Unified UI Components**
  - `LoadingState`: Consistent loading indicators across all pages
  - `ErrorState`: Standardized error display with retry functionality
  - `EmptyState`: Beautiful empty state with customizable actions
  - All components use glassmorphism theme

- 🔀 **Improved Navigation Flow**
  - Direct navigation buttons between pipeline steps
  - "Menü Yükle" button in tender detail page
  - "Maliyet Analizine Geç" in menu parser
  - "Karar Ver" in cost analysis
  - "Teklif Hazırla" in decision page

### Changed
- 📄 **Page Enhancements**
  - `/ihale`: Changed from Link to button with `startNewPipeline()` call
  - `/ihale/[id]`: Added progress bar and navigation to menu upload
  - `/menu-parser`: Auto-displays tender info, navigation to cost analysis
  - `/cost-analysis`: Auto-fills data from store, improved flow
  - `/decision`: Uses all pipeline data, added proposal preparation button

### Fixed
- 🐛 **Data Loss Prevention**
  - Fixed data loss when navigating between pages
  - Fixed form data reset on page refresh
  - Fixed manual re-entry requirements
  - All pipeline data now persists in localStorage

### Technical
- Added `zustand` with `persist` middleware for state management
- Implemented TypeScript interfaces for all pipeline data types
- Created reusable UI components with Framer Motion animations
- Enhanced type safety across the pipeline

## [3.0.0] - 2025-11-10

### Added
- 📦 **Multi-Format Tender Export System**
  - CSV export with UTF-8 BOM for Excel compatibility
  - JSON export with metadata (count, date, source)
  - TXT export with human-readable formatting and emojis
  - Beautiful formatting for all export types

- 🔄 **SPA Spinner Handling**
  - Network request monitoring for XHR/Fetch calls
  - Smart content waiting for dynamic content
  - Reliable tender detail extraction

- 💾 **Database Caching Strategy**
  - SQLite-backed tender persistence
  - Fast page loads from cached data
  - "Yenile" button for fresh data fetch

### Changed
- İhalebul worker now handles SPA architecture properly
- Improved tender detail page extraction
- Enhanced export functionality with multiple formats

## [2.5.0] - 2025-11-05

### Added
- 🌐 **İhalebul.com Integration**
  - Automated tender scraping with Playwright
  - Session-based authentication
  - Multi-page pagination support
  - Tender detail extraction

- 🤖 **Gemini 2.0 Vision OCR**
  - Smart OCR triggering for low-density PDFs
  - Automatic text extraction from documents
  - Integration with tender upload flow

### Changed
- Enhanced tender upload with document analysis
- Improved PDF processing capabilities

## [2.0.0] - 2025-10-28

### Added
- 🔐 **Authentication System**
  - NextAuth v5 with JWT strategy
  - Multi-organization support
  - Role-based access control (RBAC)
  - Protected routes via middleware

- 📊 **Monitoring Dashboard**
  - Real-time API metrics
  - Token usage tracking
  - Performance visualization with Recharts
  - System health indicators

- 📝 **AI Logger**
  - Structured logging for AI operations
  - Token counting and cost tracking
  - Performance metrics collection

## [1.0.0] - 2025-10-15

### Added
- 🎯 **Core Pipeline Implementation**
  - Tender upload and parsing
  - Menu file parser
  - Cost analysis with Claude AI
  - Decision engine
  - Report generation (PDF/Excel)

- 🎨 **Glassmorphism UI Theme**
  - Modern glass-effect design
  - Gradient buttons and cards
  - Consistent typography system
  - Dark theme optimized

- 🧠 **Claude Sonnet 4.5 Integration**
  - Intelligent cost calculation
  - Risk assessment
  - Strategic decision making
  - Structured JSON responses

### Technical
- Next.js 16 with App Router
- TypeScript strict mode
- SQLite database
- Tailwind CSS 4
- Upstash Redis cache

---

For more details on each release, see the [GitHub releases](https://github.com/procheff/procheff-v3/releases) page.