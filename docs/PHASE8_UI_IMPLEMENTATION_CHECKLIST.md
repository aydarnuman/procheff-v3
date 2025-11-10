# ✅ Phase 8 UI Implementation Checklist

**Procheff-v3 Enterprise**  
📅 Başlangıç: 11 Kasım 2025  
👤 Sorumlu: @numanaydar  
🧠 Versiyon: v3.8.0-enterprise

---

## 🎯 Amaç

Phase 8 kapsamında backend'de %100 hazır olan modüllerin UI tarafını tamamlayarak sistemin **%95+ arayüz kapsamına** ulaşması.

---

## 🗂️ Sprint Kapsamı

| Modül                                                         | Durum         | Sprint   | Not                         |
| ------------------------------------------------------------- | ------------- | -------- | --------------------------- |
| Batch Processing UI                                           | 🔴 Başlanmadı | Sprint 1 | Kritik                      |
| Settings Alt Sayfaları (Profile, Pipeline, Database, Reports) | 🟡 Devam      | Sprint 1 | 5/9 mevcut                  |
| Rate Limiting & Caching UI                                    | 🔴 Başlanmadı | Sprint 2 | Backend hazır               |
| İhale History UI                                              | 🟡 Planlandı  | Sprint 2 | API var                     |
| Auto-Pipeline History UI                                      | 🟡 Planlandı  | Sprint 2 | Klasör mevcut               |
| Monitoring Dashboard Geliştirmeleri                           | 🟠 Planlandı  | Sprint 3 | Mevcut sayfa geliştirilecek |
| Notifications Improvements                                    | 🟢 Opsiyonel  | Sprint 3 | Temel özellikler var        |
| Report Export UI Enhancements                                 | 🟢 Opsiyonel  | Sprint 3 | Template sistem             |

---

## 📋 Görev Listesi

### 🟥 Sprint 1 – Critical Features (11-17 Kasım 2025)

#### 1️⃣ Batch Processing UI (3 gün)

- [ ] **Sayfa Oluştur**: `/batch/page.tsx` – multi-file upload arayüzü
  - Formidable kullanarak 50 dosyaya kadar upload
  - Drag & Drop zone
  - File type validation (PDF, DOCX, TXT, CSV)
  - Priority selector (High, Normal, Low)
- [ ] **Job Listesi**: `/batch/jobs/page.tsx` – job listesi tablosu
  - SQLite'dan batch_jobs sorgusu
  - Status badgeleri (pending, processing, completed, failed)
  - Filter ve sort özelliği
  - Real-time update (polling 5s)
- [ ] **Job Detay**: `/batch/jobs/[id]/page.tsx` – tekil job detay sayfası
  - Job metadata ve timeline
  - File list with individual status
  - Retry butonu (failed files için)
  - Download results (JSON/Excel)
- [ ] **Component**: `BatchUploadZone.tsx` (Drag & Drop)
  - react-dropzone integration
  - File preview list
  - Upload progress bars
  - Error handling UI
- [ ] **Component**: `BatchProgressTracker.tsx` (Progress tracker)
  - Linear progress bar
  - File-by-file status badges
  - Success/failed/pending counters
  - ETA calculation
- [ ] **Navigation**: Sidecar menüsüne "Batch İşlem" ekle
  - Icon: Layers (lucide-react)
  - Badge for active jobs
  - Position: After "Oto Analiz"
- [ ] **Real-time**: SSE bağlantısı ile real-time progress
  - EventSource → `/api/batch/jobs/[id]/events`
  - Progress updates
  - Error notifications

#### 2️⃣ Settings Sub-Pages (4 sayfa - 2 gün)

##### A. Profile Settings (`/settings/profile/page.tsx`)

- [ ] **Form Fields**:
  - Avatar upload (base64 encode)
  - Name, Email, Phone
  - Şifre değiştirme (old password + new password + confirm)
  - 2FA toggle switch
  - Active sessions table
- [ ] **Actions**:
  - Save butonu (PATCH `/api/auth/profile`)
  - Avatar crop modal (react-image-crop)
  - Logout all sessions butonu

##### B. Pipeline Settings (`/settings/pipeline/page.tsx`)

- [ ] **Configuration Options**:
  - Max retry attempts (slider 1-5)
  - Timeout values (OCR, Analysis, Cost, Decision)
  - Concurrent job limit (slider 1-10)
  - Priority queue default (dropdown)
  - Auto-export toggles (PDF, Excel)
  - Pipeline notification preferences (checkboxes)
- [ ] **Form Handling**:
  - Save to env variables or DB config table
  - Validation with Zod schema
  - Success toast notification

##### C. Database Settings (`/settings/database/page.tsx`)

- [ ] **Database Info Card**:
  - File size (procheff.db)
  - Total records (logs, users, orgs)
  - Last vacuum date
  - SQLite version
- [ ] **Actions**:
  - Log retention policy (dropdown: 7/30/90 days, Never)
  - Backup database butonu (download .db file)
  - Vacuum database butonu (VACUUM command)
  - Clear cache butonu (if Redis enabled)
  - Clear old logs butonu (DELETE WHERE created_at < ...)

##### D. Reports Settings (`/settings/reports/page.tsx`)

- [ ] **Template Options**:
  - Template selector (Modern / Classic / Minimalist)
  - Preview images for each template
  - Excel format (xlsx / xls)
  - Default language (TR / EN)
- [ ] **Branding**:
  - Logo upload (PNG, JPG max 2MB)
  - Footer text input
  - Watermark toggle
  - Company name input
- [ ] **Form Submit**:
  - Save to config table or JSON file
  - Preview modal (sample PDF)

##### E. Common Component

- [ ] **SettingsCard.tsx** – ortak tasarım bileşeni
  - Glass card wrapper
  - Title + description props
  - Save button with loading state
  - Reset to defaults butonu
- [ ] **Feature Flags UI**:
  - `/settings/performance/page.tsx` içinde
  - Checkboxes for ENABLE_RATE_LIMITING, ENABLE_CACHING, ENABLE_BATCH
  - Redis config form (URL, Token)
  - Test connection butonu

---

### 🟡 Sprint 2 – High Priority (18-24 Kasım 2025)

#### 3️⃣ Rate Limiting & Caching UI (2 gün)

##### A. Monitoring Dashboard Cards

- [ ] **RateLimitCard.tsx** – aktüel limit ve kullanım
  - Current usage vs limit (progress bar)
  - Requests remaining
  - Reset time countdown
  - Per-endpoint breakdown table
- [ ] **CacheMetricsCard.tsx** – hit/miss istatistikleri
  - Hit rate percentage (gauge chart)
  - Total hits/misses (bar chart)
  - Cache size (MB)
  - Most cached keys (top 10 table)
- [ ] **RedisHealthIndicator.tsx** – bağlantı durumu
  - Connection status badge (green/red)
  - Latency (ms)
  - Memory usage (Redis info)
  - Uptime

##### B. Settings Page

- [ ] **Performance Settings** (`/settings/performance/page.tsx`)
  - Feature toggles (Rate Limit ON/OFF, Cache ON/OFF)
  - Redis configuration form
  - TTL settings (sliders for each cache type)
  - Rate limit thresholds (editable per endpoint)
  - Clear all cache butonu
  - Test Redis connection butonu

#### 4️⃣ İhale History UI (2 gün)

- [ ] **Backend Endpoint**: `/api/ihale/jobs` GET
  - Return list of all ihale uploads
  - Filter by status, date range
  - Pagination (offset/limit)
- [ ] **History Page**: `/ihale/history/page.tsx`
  - Table view: Dosya adı, Tarih, Kurum, Bütçe, Status
  - Filter sidebar (date picker, status dropdown)
  - Sort by date/status
  - Search bar (kurum ismi)
  - View details butonu → redirect to `/ihale/jobs/[id]`
- [ ] **Jobs List**: `/ihale/jobs/page.tsx`
  - Active/pending jobs only
  - Progress indicators
  - Cancel job butonu
  - Retry failed jobs
- [ ] **Job Detail**: `/ihale/jobs/[id]/page.tsx`
  - Full ihale analysis result
  - OCR transcript
  - File preview (PDF embed)
  - Download JSON butonu
  - Re-analyze butonu

#### 5️⃣ Auto-Pipeline History UI (1 gün)

- [ ] **Check Existing**: `/auto/history/page.tsx` klasörü var mı kontrol et
  - Eğer varsa içini incele, eksikleri tamamla
  - Yoksa sıfırdan oluştur
- [ ] **History Page Features**:
  - List of completed pipeline runs
  - Timeline view (Upload → OCR → Analysis → Cost → Decision)
  - Success/failure badges
  - Duration (total time)
  - View results butonu
- [ ] **Run Detail**: `/auto/runs/[id]/page.tsx`
  - Step-by-step breakdown
  - Each step's duration and status
  - Error messages (if any)
  - Retry entire pipeline butonu
  - Download combined report (PDF/Excel)

---

### 🟠 Sprint 3 – Improvements (25 Kasım – 01 Aralık 2025)

#### 6️⃣ Monitoring Dashboard Enhancements (2 gün)

- [ ] **New Metrics Card**: Cache performance
  - Line chart: hit rate over time
  - Table: cache keys by usage frequency
- [ ] **New Metrics Card**: Rate limit status
  - Bar chart: requests per endpoint
  - Alerts when approaching limit
- [ ] **Token Usage Breakdown**:
  - Pie chart: Claude vs Gemini token distribution
  - Cost per model (estimate $)
  - Total tokens used (last 24h, 7d, 30d)
- [ ] **AI Cost Tracking**:
  - Line chart: daily cost trend
  - Total spent (MTD, YTD)
  - Budget alert threshold (configurable)
  - Cost per analysis type breakdown

#### 7️⃣ Notifications Improvements (1 gün)

- [ ] **Read/Unread Toggle**:
  - Tab switcher (All / Unread / Read)
  - Mark as read on click
- [ ] **Bulk Operations**:
  - Select all checkbox
  - Bulk mark as read butonu
  - Bulk delete butonu
- [ ] **Filtering**:
  - Type filter dropdown (Success, Error, Warning, Info)
  - Date range picker
  - Search bar (message text)
- [ ] **Actions**:
  - Delete individual notification (trash icon)
  - Clear all notifications butonu (with confirmation modal)

#### 8️⃣ Report Export Enhancements (2 gün)

- [ ] **Template Picker** (`/reports/page.tsx`):
  - Radio buttons with preview thumbnails
  - Modern, Classic, Minimalist styles
  - Live preview iframe
- [ ] **Report Preview Modal**:
  - Generate PDF in memory
  - Display in modal (PDF.js viewer)
  - Download or regenerate options
- [ ] **Saved Reports History**:
  - `/reports/history/page.tsx`
  - List of previously generated reports
  - Download links (stored in filesystem or DB)
  - Delete old reports
- [ ] **Scheduled Reports UI**:
  - Cron-like scheduler UI
  - Weekly summary checkbox
  - Email recipients input
  - Time picker (send at specific hour)
  - Save schedule → backend cron job

---

## 📁 Klasör Yapısı Hedefi

```
src/
├── app/
│   ├── batch/                     # 🆕 YENİ
│   │   ├── page.tsx              # Multi-file upload
│   │   ├── jobs/
│   │   │   ├── page.tsx          # Job list
│   │   │   └── [id]/page.tsx     # Job detail
│   │   └── history/page.tsx      # Completed batches
│   │
│   ├── ihale/
│   │   ├── workspace/page.tsx    # ✅ MEVCUT
│   │   ├── history/page.tsx      # 🆕 YENİ
│   │   ├── jobs/
│   │   │   ├── page.tsx          # 🆕 YENİ
│   │   │   └── [id]/page.tsx     # 🆕 YENİ
│   │
│   ├── auto/
│   │   ├── page.tsx              # ✅ MEVCUT
│   │   ├── history/              # ⚠️ KONTROL ET
│   │   │   └── page.tsx          # Var mı?
│   │   └── runs/
│   │       └── [id]/page.tsx     # 🆕 YENİ
│   │
│   ├── settings/
│   │   ├── page.tsx              # ✅ MEVCUT
│   │   ├── profile/page.tsx      # 🆕 YENİ
│   │   ├── pipeline/page.tsx     # 🆕 YENİ
│   │   ├── database/page.tsx     # 🆕 YENİ
│   │   ├── reports/page.tsx      # 🆕 YENİ
│   │   ├── performance/page.tsx  # 🆕 YENİ (Rate limit + Cache)
│   │   └── ...existing...        # ✅ MEVCUT (ai, appearance, etc.)
│   │
│   └── monitor/
│       └── page.tsx              # ⚠️ GELİŞTİR (new cards)
│
├── components/
│   ├── batch/                    # 🆕 YENİ KLASÖR
│   │   ├── BatchUploadZone.tsx
│   │   ├── BatchJobList.tsx
│   │   ├── BatchProgressTracker.tsx
│   │   └── BatchRetryManager.tsx
│   │
│   ├── settings/                 # 🆕 YENİ KLASÖR
│   │   ├── SettingsCard.tsx
│   │   ├── ProfileForm.tsx
│   │   ├── PipelineConfig.tsx
│   │   ├── DatabaseManager.tsx
│   │   └── ReportTemplateSelector.tsx
│   │
│   ├── monitoring/               # ⚠️ GELİŞTİR
│   │   ├── RateLimitCard.tsx    # 🆕 YENİ
│   │   ├── CacheMetricsCard.tsx # 🆕 YENİ
│   │   ├── RedisHealthIndicator.tsx # 🆕 YENİ
│   │   └── ...existing...
│   │
│   └── common/                   # 🆕 YENİ KLASÖR (optional)
│       ├── FormLayout.tsx
│       ├── DataTable.tsx
│       └── EmptyState.tsx
│
└── features/                     # ✅ MEVCUT
    ├── caching/
    ├── rate-limiting/
    ├── batch-processing/
    └── config.ts
```

---

## 🧠 Kalite Kontrol Kriterleri

| Kriter                | Beklenen                  | Ölçüm Yöntemi                  |
| --------------------- | ------------------------- | ------------------------------ |
| **UI Coverage**       | ≥ 95%                     | Checklist completion rate      |
| **Build Hataları**    | 0                         | `npx tsc --noEmit`             |
| **Lint Warnings**     | 0                         | `npm run lint`                 |
| **Page Load Time**    | ≤ 2s                      | Chrome DevTools Network tab    |
| **SSE Latency**       | ≤ 300ms                   | EventSource message timestamp  |
| **Error Rate**        | ≤ 0.1%                    | Monitor dashboard API errors   |
| **Docs Sync**         | 100%                      | Manual review of README + docs |
| **Feature Flags**     | All `true`                | Check `.env.local`             |
| **Responsive Design** | Mobile + Tablet + Desktop | Test on 3 screen sizes         |
| **Accessibility**     | WCAG 2.1 AA               | aXe DevTools audit             |

---

## 🔍 Doğrulama Adımları

### Sprint 1 Checklist

1. [ ] `npm run dev` → Hata olmadan başlıyor mu?
2. [ ] `/batch` sayfası açılıyor, dosya yüklenebiliyor mu?
3. [ ] `/batch/jobs` → Job listesi görüntüleniyor mu?
4. [ ] `/settings/profile` → Form submit ediliyor mu?
5. [ ] `/settings/pipeline` → Ayarlar kaydediliyor mu?
6. [ ] `/settings/database` → DB boyutu görüntüleniyor mu?
7. [ ] `/settings/reports` → Logo upload çalışıyor mu?
8. [ ] Sidecar menüsünde "Batch İşlem" linki var mı?

### Sprint 2 Checklist

9. [ ] `/monitor` → RateLimitCard ve CacheMetricsCard görünüyor mu?
10. [ ] `/settings/performance` → Redis config save ediliyor mu?
11. [ ] `/ihale/history` → Geçmiş analizler listeleniyor mu?
12. [ ] `/ihale/jobs/[id]` → Detay sayfası açılıyor mu?
13. [ ] `/auto/history` → Pipeline runs görüntüleniyor mu?
14. [ ] `/auto/runs/[id]` → Timeline gösterimi çalışıyor mu?

### Sprint 3 Checklist

15. [ ] Monitor dashboard'da yeni metrik kartları var mı?
16. [ ] Notifications'da bulk mark as read çalışıyor mu?
17. [ ] `/reports` → Template picker görünüyor mu?
18. [ ] Report preview modal açılıyor mu?
19. [ ] Tüm sayfalar mobile responsive mı?
20. [ ] Error boundaries tüm kritik sayfalarda mı?

---

## 🧾 Raporlama

### Her Sprint Sonunda:

- `docs/PROGRESS_REPORT.md` dosyasına ekle:
  - ✅ Tamamlanan görevler listesi
  - 📸 Screenshot linkleri (Imgur/GitHub Issues)
  - ❌ Hata listesi ve çözümleri
  - 🎨 UI önizleme görselleri
  - ⏱️ Sprint süre analizi (planlanan vs gerçek)
  - 🔄 Next sprint için notlar

### Haftalık Standup (Opsiyonel):

- Önceki gün tamamlananlar
- Bugün yapılacaklar
- Engeller/blockers

---

## 📊 Beklenen Sonuç

Phase 8 bittiğinde:

- **Frontend kapsamı:** %95+ ✅
- **Backend-Frontend sync:** %100 ✅
- **Feature flags:** Hepsi `true` (aktif) ✅
- **Kullanıcı deneyimi:** Kurumsal seviye ✅
- **Dokümantasyon:** Tam senkron ✅
- **Monitoring:** Real-time ve ölçülebilir ✅
- **Batch processing:** Tam fonksiyonel ✅
- **Settings:** Self-service yapılandırma ✅

---

## 📈 İlerleme Takibi

### Sprint 1 (11-17 Kasım)

- [ ] Batch Processing UI (0/7 görev)
- [ ] Settings Sub-Pages (0/4 sayfa)
- **Hedef:** %100 tamamlama

### Sprint 2 (18-24 Kasım)

- [ ] Rate Limiting & Caching UI (0/4 görev)
- [ ] İhale History UI (0/4 görev)
- [ ] Auto-Pipeline History (0/3 görev)
- **Hedef:** %100 tamamlama

### Sprint 3 (25 Kas - 01 Ara)

- [ ] Monitoring Enhancements (0/4 görev)
- [ ] Notifications Improvements (0/4 görev)
- [ ] Report Export Enhancements (0/4 görev)
- **Hedef:** %80 tamamlama (opsiyonel)

---

## 🎯 Başarı Metrikleri

| Metrik                | Başlangıç | Hedef    | Gerçekleşen |
| --------------------- | --------- | -------- | ----------- |
| UI Coverage           | 60%       | 95%      | _TBD_       |
| Settings Pages        | 5/9       | 9/9      | _TBD_       |
| Feature Flags Active  | 0/3       | 3/3      | _TBD_       |
| API Endpoints with UI | 70%       | 95%      | _TBD_       |
| User Complaints       | ?         | <2/month | _TBD_       |
| Page Load Avg         | ?         | <2s      | _TBD_       |
| Error Rate            | ?         | <0.1%    | _TBD_       |

---

## 🚀 Quick Start

### Sprint 1 Başlangıç Komutları:

```bash
# 1. Branch oluştur
git checkout -b feature/phase8-sprint1

# 2. Klasörleri oluştur
mkdir -p src/app/batch/{jobs,history}
mkdir -p src/app/settings/{profile,pipeline,database,reports,performance}
mkdir -p src/components/{batch,settings,monitoring}

# 3. Development server başlat
npm run dev

# 4. Type check
npx tsc --noEmit

# 5. Lint
npm run lint
```

### Günlük Rutin:

```bash
# Sabah
git pull origin main
npm install  # Yeni dependency varsa

# Akşam
git add .
git commit -m "feat(phase8): [Sprint X] [Component Name] - [Description]"
git push origin feature/phase8-sprint1

# Hafta sonu
# PROGRESS_REPORT.md güncelle
# Screenshot'ları ekle
```

---

**Hazırlayan:** AI Project Copilot  
**Onaylayan:** @numanaydar  
**Tarih:** 11 Kasım 2025  
**Versiyon:** 1.0.0  
**Durum:** 🔴 Aktif Sprint

---

## 📚 İlgili Dokümantasyon

- [UI/UX Analysis Report](../UI-UX-ANALYSIS-REPORT.md)
- [Architecture](./ARCHITECTURE.md)
- [Batch Processing](./BATCH-PROCESSING.md)
- [Production Features](./PRODUCTION-FEATURES.md)
- [Rate Limiting](./RATE-LIMITING.md)
- [Caching](./CACHING.md)
- [Database Schema](./DATABASE.md)

---

## 💬 Notlar

- Her component için `.stories.tsx` (Storybook) dosyası oluştur (opsiyonel)
- Unit testler (`*.test.tsx`) öncelikli değil ama iyi olur
- E2E testler (Playwright) Sprint 3'te eklenebilir
- Performance profiling (React DevTools) her sprint sonunda yap
- Lighthouse audit (accessibility + performance) Sprint 3'te

---

**🎯 Let's Ship Phase 8!** 🚀
