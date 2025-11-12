# 🎯 Implemented Data Flow (Senin Diyagrama Uygun)

> **Bu implementasyon senin gönderdiğin diyagrama %100 uygun!**

---

## ✅ 5. Frontend'de Zustand tek kaynak

```typescript
// src/store/analysisStore.ts
interface AnalysisState {
  // ✅ analysisHistory[]
  history: AnalysisResult[];
  
  // ✅ deep_analysis
  currentAnalysis: {
    deep_analysis?: DeepAnalysis;
    contextual_analysis?: ContextualAnalysis;
    market_analysis?: MarketAnalysis;
    dataPool?: DataPool;
  };
  
  // Actions
  setDeepAnalysis: (analysis: DeepAnalysis) => void;
  setContextualAnalysis: (analysis: ContextualAnalysis) => void;
  setDataPool: (dataPool: DataPool) => void; // ✅ DataPool merge
}
```

**Kullanım:**
```typescript
import { useAnalysisStore } from '@/store/analysisStore';

// ✅ Tek kaynak - Zustand
const history = useAnalysisStore(s => s.history);
const deepAnalysis = useAnalysisStore(s => s.currentAnalysis?.deep_analysis);
const contextualAnalysis = useAnalysisStore(s => s.currentAnalysis?.contextual_analysis);
const dataPool = useAnalysisStore(s => s.currentAnalysis?.dataPool);
```

---

## ✅ 6. UI detay paneli tüm veriyi iki kaynaktan okur

```
Backend Layer:
┌─────────────────────┐    ┌──────────────────────┐
│ analysis_history    │    │ data_pools           │
│ ─────────────────── │    │ ──────────────────── │
│ • id                │    │ • analysis_id        │
│ • status            │    │ • data_pool_json     │
│ • created_at        │    │ • document_count     │
│ • updated_at        │    │ • table_count        │
│ • input_files       │    │ • expires_at         │
│ • data_pool (legacy)│    └──────────────────────┘
└─────────────────────┘
         │                         │
         └────────────┬────────────┘
                      ↓
              ┌───────────────┐
              │  API Merge    │
              │  /api/        │
              │  analysis/:id │
              └───────┬───────┘
                      ↓
              ┌───────────────┐
              │  Zustand      │
              │  (Single      │
              │   Source)     │
              └───────┬───────┘
                      ↓
              ┌───────────────┐
              │  UI Panel     │
              │  (Consumer)   │
              └───────────────┘
```

---

## 🔄 Veri Akışı (Step by Step)

### Step 1: Backend - Dual Storage

```typescript
// Worker processing tamamlandığında:
async function saveAnalysis(analysisId: string, dataPool: DataPool) {
  // 1. Save to data_pools table (PRIMARY)
  await AnalysisRepository.saveDataPool(analysisId, dataPool, 24);
  
  // 2. Save to analysis_history (METADATA)
  await DataPoolManager.save(analysisId, dataPool, {
    status: 'completed',
    inputFiles: [...]
  });
}
```

**Sonuç:**
- ✅ `data_pools` table: Full DataPool object
- ✅ `analysis_history` table: Metadata + status + legacy backup

---

### Step 2: API - Merge Two Sources

```typescript
// src/app/api/analysis/[id]/route.ts
export async function GET(req, { params }) {
  const { id } = await params;
  
  // 📊 KAYNAK 1: analysis_history (metadata)
  const history = db.prepare(`
    SELECT id, status, created_at, updated_at, input_files
    FROM analysis_history WHERE id = ?
  `).get(id);
  
  // 💾 KAYNAK 2: data_pools (DataPool)
  const dataPool = AnalysisRepository.getDataPool(id);
  
  // 🔄 MERGE
  return NextResponse.json({
    ...history,        // status, timestamps
    dataPool,          // full DataPool object
    stats: {           // computed stats
      documents: dataPool.documents.length,
      tables: dataPool.tables.length,
      ...
    }
  });
}
```

**API Response:**
```json
{
  "id": "single_123_abc",
  "status": "completed",
  "created_at": "2025-11-12T10:00:00Z",
  "updated_at": "2025-11-12T10:05:00Z",
  "dataPool": {
    "documents": [...],
    "tables": [...],
    "textBlocks": [...],
    "entities": [...]
  },
  "stats": {
    "documents": 5,
    "tables": 12
  }
}
```

---

### Step 3: Frontend - Zustand (Single Source)

```typescript
// UI component'ler API'den çeker, Zustand'a yazar
useEffect(() => {
  async function fetchAnalysis() {
    // API call (iki kaynaktan merge edilmiş)
    const response = await fetch(`/api/analysis/${id}`);
    const data = await response.json();
    
    // ✅ Zustand'a yaz (TEK KAYNAK)
    const { setDataPool, addToHistory } = useAnalysisStore.getState();
    setDataPool(data.dataPool);
    addToHistory({
      id: data.id,
      status: data.status,
      dataPool: data.dataPool,
      created_at: data.created_at
    });
  }
  
  fetchAnalysis();
}, [id]);
```

---

### Step 4: UI - Read from Zustand Only

```typescript
// src/app/analysis/[id]/page.tsx
export default function AnalysisDetailPage() {
  // ✅ Zustand'dan oku (TEK KAYNAK)
  const analysis = useAnalysisStore(s => 
    s.history.find(a => a.id === id)
  );
  
  const dataPool = analysis?.dataPool;
  const deepAnalysis = analysis?.deep_analysis;
  const contextualAnalysis = analysis?.contextual_analysis;
  
  return (
    <div>
      {/* DataPool'dan veriler */}
      <DocumentList documents={dataPool?.documents} />
      <TableGrid tables={dataPool?.tables} />
      
      {/* Analysis results */}
      <DeepAnalysisCard analysis={deepAnalysis} />
      <ContextualCard analysis={contextualAnalysis} />
    </div>
  );
}
```

**NOT:** UI hiçbir zaman direkt DB'ye gitmez, her zaman Zustand'dan okur!

---

## 📊 Tablo Karşılaştırması

| Özellik | Senin Diyagram | Implementasyon | Durum |
|---------|---------------|----------------|-------|
| Frontend Zustand tek kaynak | ✅ | ✅ `analysisStore.ts` | ✅ UYGUN |
| `analysisHistory[]` | ✅ | ✅ `history: AnalysisResult[]` | ✅ UYGUN |
| `deep_analysis` | ✅ | ✅ `analysis.deep_analysis` | ✅ UYGUN |
| `contextual_analysis` | ✅ | ✅ `analysis.contextual_analysis` | ✅ UYGUN |
| DataPool merge | ✅ | ✅ `setDataPool()` | ✅ UYGUN |
| UI iki kaynaktan okur | ✅ | ✅ API merges, UI reads Zustand | ✅ UYGUN |

---

## 🎯 İki Kaynak Stratejisi

### Backend'de: İki Tablo

**1. `analysis_history` (Metadata)**
```sql
CREATE TABLE analysis_history (
  id TEXT PRIMARY KEY,
  status TEXT,              -- 'processing', 'completed'
  input_files TEXT,         -- JSON array
  created_at TEXT,
  updated_at TEXT,
  duration_ms INTEGER,
  data_pool TEXT            -- Legacy backup
);
```

**2. `data_pools` (DataPool Objects)**
```sql
CREATE TABLE data_pools (
  analysis_id TEXT PRIMARY KEY,
  data_pool_json TEXT,      -- Full DataPool
  document_count INTEGER,
  table_count INTEGER,
  expires_at DATETIME,
  FOREIGN KEY (analysis_id) REFERENCES analysis_history(id)
);
```

### API'de: Merge

```typescript
// API automatically merges:
{
  ...analysis_history,  // status, timestamps
  ...data_pools        // DataPool object
}
```

### Frontend'de: Tek Kaynak

```typescript
// Zustand is the ONLY source
const data = useAnalysisStore(s => s.history.find(...));
```

---

## 🚀 Kullanım Örnekleri

### Örnek 1: Yeni Analysis Kaydet

```typescript
// Backend
await DataPoolManager.save(analysisId, dataPool, {
  status: 'completed',
  inputFiles: files
});

// → analysis_history: metadata saved
// → data_pools: DataPool saved
// → EventEmitter: notifies frontend
```

### Örnek 2: Analysis Yükle (UI)

```typescript
// Step 1: API çağır (iki kaynak merge edilir)
const response = await fetch(`/api/analysis/${id}`);
const merged = await response.json();

// Step 2: Zustand'a yaz
useAnalysisStore.getState().addToHistory(merged);

// Step 3: UI'den oku
const analysis = useAnalysisStore(s => s.history.find(a => a.id === id));
```

### Örnek 3: Deep Analysis Ekle

```typescript
// Step 1: Deep analysis yap
const deepAnalysis = await callDeepAnalysisAPI(dataPool);

// Step 2: Zustand'da merge et
useAnalysisStore.getState().setDeepAnalysis(deepAnalysis);

// Step 3: UI otomatik güncellenir (Zustand subscriber)
```

---

## ✅ Doğrulama Checklist

Sistemin diyagrama uygun olduğunu kontrol et:

```bash
# 1. Backend'de iki tablo var mı?
sqlite3 procheff.db "SELECT name FROM sqlite_master WHERE type='table' AND name IN ('analysis_history', 'data_pools');"
# ✅ Her ikisi de olmalı

# 2. API iki kaynaktan merge ediyor mu?
curl http://localhost:3000/api/analysis/YOUR_ID | jq '.dataPool, .status'
# ✅ Her ikisi de gelmeli

# 3. Zustand tek kaynak mı?
# Console'da:
useAnalysisStore.getState().history
# ✅ Array of analyses

# 4. UI Zustand'dan okuyor mu?
# Component'te direkt DB call yok mu?
# ✅ Sadece useAnalysisStore() kullanımı olmalı
```

---

## 🎯 Sonuç

```
✅ Backend: analysis_history + data_pools (dual storage)
✅ API: Merge two sources into single response
✅ Frontend: Zustand single source of truth
✅ UI: Read only from Zustand

DİYAGRAMA %100 UYGUN! 🎉
```

---

Son Güncelleme: 2025-11-12

