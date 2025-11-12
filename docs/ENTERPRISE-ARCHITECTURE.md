# 🏗️ Enterprise-Grade Analysis Architecture

> **4 Katmanlı Doğru Mimari - Production Ready**

---

## 🎯 4 Katman Özet

```
Layer 1: BACKEND TABLES    → analysis_history + data_pools (separated storage)
Layer 2: API LAYER         → Merge both sources into unified response
Layer 3: FRONTEND ZUSTAND  → Single source of truth (analysisHistory[])
Layer 4: UI LAYER          → Passive reader (no merging, no API calls)
```

---

## 🔥 LAYER 1: BACKEND TABLES (Kalıcı Veri Katmanı)

### 1.1 analysis_history (İş Akışı Metadata)

**Amaç:** Analiz yaşam döngüsünü takip et

```sql
CREATE TABLE analysis_history (
  -- Identity
  id TEXT PRIMARY KEY,
  
  -- Lifecycle
  status TEXT CHECK(status IN ('pending', 'processing', 'completed', 'failed')),
  
  -- Timeline
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  started_at TEXT,
  completed_at TEXT,
  
  -- Processing metadata
  steps_json TEXT,           -- JSON array of pipeline steps
  duration_ms INTEGER,
  
  -- Input/Output
  input_files TEXT,          -- JSON array [{name, size, hash}]
  
  -- Error handling
  error TEXT,
  warnings TEXT,
  
  -- OPTIONAL: legacy backup (will be removed after migration)
  data_pool TEXT             -- Temporary column for backward compatibility
);

-- Indexes for performance
CREATE INDEX idx_analysis_status ON analysis_history(status, created_at DESC);
CREATE INDEX idx_analysis_created ON analysis_history(created_at DESC);
```

**Örnek Kayıt:**
```json
{
  "id": "analysis_123",
  "status": "completed",
  "created_at": "2025-11-12T10:00:00Z",
  "updated_at": "2025-11-12T10:05:00Z",
  "started_at": "2025-11-12T10:00:05Z",
  "completed_at": "2025-11-12T10:05:00Z",
  "duration_ms": 295000,
  "input_files": "[{\"name\":\"tender.pdf\", \"size\":1024000}]",
  "steps_json": "[\"extract\", \"contextual\", \"market\", \"deep\"]",
  "error": null,
  "warnings": null
}
```

---

### 1.2 data_pools (Gerçek DataPool)

**Amaç:** İşin özü - extracted data

```sql
CREATE TABLE data_pools (
  -- Identity (FK to analysis_history)
  analysis_id TEXT PRIMARY KEY,
  
  -- DataPool JSON (full structure)
  data_pool_json TEXT NOT NULL,
  
  -- Searchable metadata (extracted for queries)
  document_count INTEGER,
  table_count INTEGER,
  text_block_count INTEGER,
  entity_count INTEGER,
  amount_count INTEGER,
  
  -- Full-text search support
  text_content TEXT,
  
  -- Expiration (cache management)
  expires_at DATETIME NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  -- Foreign key
  FOREIGN KEY (analysis_id) REFERENCES analysis_history(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX idx_datapool_expires ON data_pools(expires_at);
CREATE INDEX idx_datapool_document_count ON data_pools(document_count DESC);
```

**DataPool Structure:**
```typescript
interface DataPool {
  documents: Document[];      // PDF/TXT files metadata
  tables: Table[];            // Extracted tables
  textBlocks: TextBlock[];    // Text chunks
  entities: Entity[];         // NER results (organizations, locations)
  amounts: Amount[];          // Monetary values
  dates: Date[];              // Date mentions
  metadata: {
    ocr_used: boolean;
    processing_time: number;
    source_files: string[];
  };
}
```

---

## 🔥 LAYER 2: API LAYER (Orta Katman – Veri Birleştirme)

### 2.1 API Endpoint: GET /api/analysis/:id

**Görev:** İki kaynağı merge et, UI'ya hazır veri gönder

```typescript
// src/app/api/analysis/[id]/route.ts

export async function GET(
  req: NextRequest, 
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // ========================================
  // STEP 1: Fetch from analysis_history
  // ========================================
  const history = db.prepare(`
    SELECT 
      id, status, created_at, updated_at,
      started_at, completed_at, duration_ms,
      input_files, steps_json, error, warnings
    FROM analysis_history
    WHERE id = ?
  `).get(id);

  if (!history) {
    return NextResponse.json(
      { error: 'Analysis not found' },
      { status: 404 }
    );
  }

  // ========================================
  // STEP 2: Fetch from data_pools
  // ========================================
  const dataPoolRow = db.prepare(`
    SELECT data_pool_json
    FROM data_pools
    WHERE analysis_id = ? AND expires_at > datetime('now')
  `).get(id);

  const dataPool = dataPoolRow 
    ? JSON.parse(dataPoolRow.data_pool_json)
    : null;

  if (!dataPool) {
    return NextResponse.json(
      { error: 'DataPool not found or expired' },
      { status: 404 }
    );
  }

  // ========================================
  // STEP 3: MERGE - Create unified response
  // ========================================
  const mergedAnalysis = {
    // From analysis_history
    id: history.id,
    status: history.status,
    created_at: history.created_at,
    updated_at: history.updated_at,
    timeline: {
      started_at: history.started_at,
      completed_at: history.completed_at,
      duration_ms: history.duration_ms
    },
    
    // From data_pools
    dataPool: dataPool,
    
    // Metadata
    inputFiles: JSON.parse(history.input_files || '[]'),
    steps: JSON.parse(history.steps_json || '[]'),
    error: history.error,
    warnings: history.warnings,
    
    // Stats (computed from DataPool)
    stats: {
      documents: dataPool.documents?.length || 0,
      tables: dataPool.tables?.length || 0,
      textBlocks: dataPool.textBlocks?.length || 0,
      entities: dataPool.entities?.length || 0,
      amounts: dataPool.amounts?.length || 0
    }
  };

  return NextResponse.json(mergedAnalysis);
}
```

**API Response Format:**
```typescript
interface MergedAnalysis {
  // Metadata from analysis_history
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  created_at: string;
  updated_at: string;
  timeline: {
    started_at: string;
    completed_at: string;
    duration_ms: number;
  };
  
  // DataPool from data_pools
  dataPool: DataPool;
  
  // Additional fields
  inputFiles: Array<{name: string; size: number}>;
  steps: string[];
  error: string | null;
  warnings: string | null;
  
  // Computed stats
  stats: {
    documents: number;
    tables: number;
    textBlocks: number;
    entities: number;
    amounts: number;
  };
}
```

---

## 🔥 LAYER 3: FRONTEND ZUSTAND (Tek Kaynak)

### 3.1 Store Structure

```typescript
// src/store/analysisStore.ts

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AnalysisResult {
  // Core data (from API merged response)
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  created_at: string;
  updated_at: string;
  
  // DataPool (merged)
  dataPool: DataPool;
  
  // Analysis results (added progressively)
  contextual_analysis?: ContextualAnalysis;
  market_analysis?: MarketAnalysis;
  deep_analysis?: DeepAnalysis;
  
  // Metadata
  timeline: {
    started_at: string;
    completed_at: string;
    duration_ms: number;
  };
  stats: {
    documents: number;
    tables: number;
    textBlocks: number;
  };
}

interface AnalysisStore {
  // ✅ State - Single source of truth
  analysisHistory: AnalysisResult[];  // All analyses
  currentAnalysis: AnalysisResult | null;  // Selected one
  
  // ✅ Actions
  addAnalysis: (analysis: AnalysisResult) => void;
  updateAnalysis: (id: string, updates: Partial<AnalysisResult>) => void;
  setCurrentAnalysis: (id: string) => void;
  
  // Deep analysis actions
  setContextualAnalysis: (id: string, analysis: ContextualAnalysis) => void;
  setMarketAnalysis: (id: string, analysis: MarketAnalysis) => void;
  setDeepAnalysis: (id: string, analysis: DeepAnalysis) => void;
  
  // Getters
  getAnalysisById: (id: string) => AnalysisResult | undefined;
}

export const useAnalysisStore = create<AnalysisStore>()(
  persist(
    (set, get) => ({
      // Initial state
      analysisHistory: [],
      currentAnalysis: null,
      
      // Add new analysis
      addAnalysis: (analysis) => set((state) => ({
        analysisHistory: [analysis, ...state.analysisHistory]
      })),
      
      // Update existing
      updateAnalysis: (id, updates) => set((state) => ({
        analysisHistory: state.analysisHistory.map(a =>
          a.id === id ? { ...a, ...updates } : a
        ),
        currentAnalysis: state.currentAnalysis?.id === id
          ? { ...state.currentAnalysis, ...updates }
          : state.currentAnalysis
      })),
      
      // Set current (for detail page)
      setCurrentAnalysis: (id) => set((state) => ({
        currentAnalysis: state.analysisHistory.find(a => a.id === id) || null
      })),
      
      // Add contextual analysis result
      setContextualAnalysis: (id, analysis) => 
        get().updateAnalysis(id, { contextual_analysis: analysis }),
      
      // Add market analysis result
      setMarketAnalysis: (id, analysis) => 
        get().updateAnalysis(id, { market_analysis: analysis }),
      
      // Add deep analysis result
      setDeepAnalysis: (id, analysis) => 
        get().updateAnalysis(id, { deep_analysis: analysis }),
      
      // Get by ID
      getAnalysisById: (id) => 
        get().analysisHistory.find(a => a.id === id)
    }),
    {
      name: 'analysis-storage',
      partialize: (state) => ({
        analysisHistory: state.analysisHistory.slice(0, 20) // Keep last 20
      })
    }
  )
);
```

### 3.2 Zustand Usage Pattern

```typescript
// Hook to load analysis on page mount
export function useLoadAnalysis(id: string) {
  const { getAnalysisById, addAnalysis, setCurrentAnalysis } = useAnalysisStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadAnalysis() {
      // Check store first
      const cached = getAnalysisById(id);
      if (cached) {
        setCurrentAnalysis(id);
        setLoading(false);
        return;
      }

      // Fetch from API (merged response)
      try {
        const response = await fetch(`/api/analysis/${id}`);
        if (!response.ok) throw new Error('Failed to fetch');
        
        const mergedAnalysis = await response.json();
        
        // Add to store
        addAnalysis(mergedAnalysis);
        setCurrentAnalysis(id);
        setLoading(false);
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    }

    loadAnalysis();
  }, [id]);

  return { loading, error };
}
```

---

## 🔥 LAYER 4: UI (Passive Reader)

### 4.1 Analysis Detail Page

```typescript
// src/app/analysis/[id]/page.tsx

export default function AnalysisDetailPage({ params }: { params: { id: string } }) {
  const { id } = params;
  
  // ✅ Load analysis (only once, from API → Zustand)
  const { loading, error } = useLoadAnalysis(id);
  
  // ✅ Read from Zustand (passive)
  const analysis = useAnalysisStore(s => s.currentAnalysis);
  
  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage error={error} />;
  if (!analysis) return <NotFound />;

  return (
    <div className="analysis-detail">
      {/* Header with metadata */}
      <AnalysisHeader
        status={analysis.status}
        created_at={analysis.created_at}
        duration={analysis.timeline.duration_ms}
      />

      {/* Tabs */}
      <Tabs>
        {/* Tab 1: DataPool (Veri Havuzu) */}
        <Tab label="Veri Havuzu">
          <DataPoolViewer dataPool={analysis.dataPool} />
        </Tab>

        {/* Tab 2: Contextual Analysis */}
        <Tab label="Bağlamsal Analiz">
          <ContextualAnalysisCard 
            analysis={analysis.contextual_analysis}
            onAnalyze={() => triggerContextualAnalysis(id)}
          />
        </Tab>

        {/* Tab 3: Market Analysis */}
        <Tab label="Pazar Analizi">
          <MarketAnalysisCard 
            analysis={analysis.market_analysis}
            onAnalyze={() => triggerMarketAnalysis(id)}
          />
        </Tab>

        {/* Tab 4: Deep Analysis */}
        <Tab label="Derin Analiz">
          <DeepAnalysisCard 
            analysis={analysis.deep_analysis}
            onAnalyze={() => triggerDeepAnalysis(id)}
          />
        </Tab>
      </Tabs>
    </div>
  );
}

// ✅ Trigger functions update Zustand
async function triggerDeepAnalysis(id: string) {
  const response = await fetch('/api/analysis/deep', {
    method: 'POST',
    body: JSON.stringify({ analysisId: id })
  });
  
  const result = await response.json();
  
  // Update Zustand
  useAnalysisStore.getState().setDeepAnalysis(id, result.deep_analysis);
}
```

### 4.2 UI Components (Pure Renderers)

```typescript
// src/app/analysis/components/DataPoolViewer.tsx

interface DataPoolViewerProps {
  dataPool: DataPool;
}

export function DataPoolViewer({ dataPool }: DataPoolViewerProps) {
  return (
    <div className="datapool-viewer">
      {/* Documents */}
      <Section title="Dökümanlar">
        {dataPool.documents.map(doc => (
          <DocumentCard key={doc.id} document={doc} />
        ))}
      </Section>

      {/* Tables */}
      <Section title="Tablolar">
        {dataPool.tables.map(table => (
          <TableGrid key={table.id} table={table} />
        ))}
      </Section>

      {/* Entities */}
      <Section title="Varlıklar">
        {dataPool.entities.map(entity => (
          <EntityBadge key={entity.id} entity={entity} />
        ))}
      </Section>

      {/* Amounts */}
      <Section title="Tutarlar">
        {dataPool.amounts.map(amount => (
          <AmountCard key={amount.id} amount={amount} />
        ))}
      </Section>
    </div>
  );
}

// ✅ Pure component - no API calls, no merging, no DB knowledge
// ✅ Just renders what it receives from props (Zustand data)
```

---

## 📊 Veri Akış Diyagramı

```mermaid
graph TB
    subgraph "LAYER 1: Backend Tables"
        A[(analysis_history<br/>metadata + lifecycle)]
        B[(data_pools<br/>DataPool objects)]
    end

    subgraph "LAYER 2: API"
        C[GET /api/analysis/:id]
        D[Merge Function]
    end

    subgraph "LAYER 3: Zustand Store"
        E[analysisHistory[]]
        F[currentAnalysis]
    end

    subgraph "LAYER 4: UI"
        G[Detail Page]
        H[DataPool Viewer]
        I[Analysis Cards]
    end

    A --> C
    B --> C
    C --> D
    D -->|Merged Response| E
    E --> F
    F --> G
    G --> H
    G --> I

    style A fill:#ef4444
    style B fill:#ef4444
    style D fill:#3b82f6
    style E fill:#10b981
    style F fill:#10b981
    style G fill:#f59e0b
```

---

## ✅ Bu Mimari Sana Ne Sağlar?

| Özellik | Eski Mimari ❌ | Yeni Mimari ✅ |
|---------|---------------|---------------|
| **Veri Kaynağı** | Dağınık (API, DB, local state) | Tek kaynak (Zustand) |
| **UI Merge** | UI DataPool birleştirmeye çalışıyor | API merge ediyor, UI sadece okuyor |
| **Deep Analysis** | Sık sık patlıyor | Smooth akış |
| **Bug Rate** | Yüksek (state sync issues) | Düşük (single source) |
| **Debugging** | Zor (çok kaynak) | Kolay (Zustand devtools) |
| **Performance** | Yavaş (redundant API calls) | Hızlı (cached in Zustand) |
| **Scalability** | Zor | Kolay |

---

## 🚀 Implementasyon Adımları

### Adım 1: Backend Tabloları Güncelle ✅
```bash
# Already done!
sqlite3 procheff.db < migrations/000_create_analysis_history.sql
sqlite3 procheff.db < migrations/003_analysis_repository.sql
```

### Adım 2: API Merge Logic Ekle ✅
```typescript
// src/app/api/analysis/[id]/route.ts - Already updated!
```

### Adım 3: Zustand Store Refactor (SONRAKİ)
```typescript
// src/store/analysisStore.ts güncellenecek
```

### Adım 4: UI Components Simplify (SONRAKİ)
```typescript
// UI'dan tüm merge logic'i kaldır
// Sadece Zustand'dan oku
```

---

## 📝 Code Checklist

Implementasyon sırasında kontrol et:

```bash
# ✅ Backend
□ analysis_history table exists
□ data_pools table exists
□ Foreign key relationship OK
□ Indexes created

# ✅ API
□ GET /api/analysis/:id merges both sources
□ Response format = MergedAnalysis interface
□ Error handling for missing data
□ Cache headers set

# ✅ Zustand
□ analysisHistory[] array exists
□ currentAnalysis state exists
□ addAnalysis action works
□ updateAnalysis action works
□ setDeepAnalysis action works
□ Persistence configured

# ✅ UI
□ No direct DB access
□ No manual merging
□ Only reads from Zustand
□ Pure render components
```

---

## 🎯 Final Architecture Summary

```
✅ LAYER 1: analysis_history + data_pools (separated, normalized)
✅ LAYER 2: API merges into unified MergedAnalysis response
✅ LAYER 3: Zustand stores MergedAnalysis (single source)
✅ LAYER 4: UI passively reads from Zustand (no logic)

RESULT: Enterprise-grade, stable, maintainable, debuggable
```

---

**Hazır mıyız implementasyona?** 🚀

Son Güncelleme: 2025-11-12

