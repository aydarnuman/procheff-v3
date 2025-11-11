# 📊 Procheff-v3 Analysis System Documentation

## Table of Contents
1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Components](#components)
4. [Data Flow](#data-flow)
5. [API Reference](#api-reference)
6. [Helper Functions](#helper-functions)
7. [Usage Examples](#usage-examples)
8. [Best Practices](#best-practices)
9. [Troubleshooting](#troubleshooting)

## Overview

The Procheff-v3 analysis system processes tender documents through a 3-tab pipeline, providing comprehensive insights for procurement decisions.

## Architecture

```
┌─────────────┐     ┌──────────────────┐     ┌──────────────┐
│ Veri Havuzu │ --> │ Bağlamsal Analiz │ --> │ Derin Analiz │
│   (Data)    │     │     (Context)    │     │   (Strategy) │
└─────────────┘     └──────────────────┘     └──────────────┘
```

### Key Design Principles
- **Source Tracking**: Every data point includes file:page reference
- **Logical Grouping**: Related data appears together
- **Auto-Categorization**: Tables automatically classified
- **Export Ready**: All data exportable to CSV/Excel
- **Search Enabled**: Full-text search across all content

## Components

### 1. Veri Havuzu (Data Pool)

Located at: `/src/app/analysis/[id]/page.tsx` (DataPoolTab function)

**Sub-tabs:**
- **Ham Veri (Raw Data)**: Displays entities, dates, and text blocks
- **Tablolar (Tables)**: Shows categorized tables with export

**Features:**
```typescript
- Source tracking: "filename.pdf:42" format
- Search functionality across all data
- Export capabilities (CSV, Excel)
- Logical grouping by relevance
```

**Component Structure:**
```tsx
<DataPoolTab dataPool={dataPool}>
  <SubTabs>
    <RawDataView />
    <TablesView />
  </SubTabs>
</DataPoolTab>
```

### 2. Bağlamsal Analiz (Contextual Analysis)

Component: `/src/components/analysis/ContextualView.tsx`

**Analyzes:**
- **Operational Risks**: Assessment with severity levels (düşük/orta/yüksek)
- **Cost Deviation**: Probability percentage and factors
- **Time Suitability**: Sufficiency evaluation (yeterli/yetersiz)
- **Personnel Requirements**: Estimated count and critical positions
- **Equipment Needs**: Critical items and estimated costs

**Data Structure:**
```typescript
interface ContextualAnalysis {
  genel_degerlendirme: {
    ozet: string;
    puan: number;
    oneriler: string[];
  };
  operasyonel_riskler: {
    seviye: 'dusuk' | 'orta' | 'yuksek';
    skor: number;
    nedenler: Array<{ text: string; source_ref: string[] }>;
    onlemler: string[];
  };
  maliyet_sapma_olasiligi: {
    oran: number;
    faktorler: Array<{ text: string; confidence: number }>;
    tahmini_sapma_miktari?: number;
  };
  // ... more fields
}
```

### 3. Derin Analiz (Deep Analysis)

Located at: `/src/app/analysis/[id]/page.tsx` (DeepTab function)

**Prerequisites:**
- ✅ Completed data pool
- ✅ Completed contextual analysis
- ✅ Completed market analysis

**Output:**
- Strategic participation decision
- Confidence scoring
- Risk mitigation strategies
- Implementation roadmap

## Data Flow

### 1. Document Upload Phase
```mermaid
Document Upload → Text Extraction → OCR (if needed) → Claude Analysis → DataPool
```

### 2. Analysis Phase
```mermaid
DataPool → Contextual Analysis (AI) → Market Analysis (AI) → Deep Analysis (AI)
```

### 3. Decision Phase
```mermaid
All Analyses → Strategic Decision → Confidence Score → Final Report
```

## API Reference

### Analysis Endpoints

#### Contextual Analysis
```typescript
POST /api/analysis/contextual
Body: {
  analysisId: string;
  dataPool: DataPool;
}
Returns: {
  success: boolean;
  analysis: ContextualAnalysis;
}
```

#### Market Analysis
```typescript
POST /api/analysis/market
Body: {
  analysisId: string;
  dataPool: DataPool;
}
Returns: {
  success: boolean;
  marketAnalysis: MarketAnalysis;
}
```

#### Deep Analysis
```typescript
POST /api/analysis/deep
Body: {
  analysisId: string;
  contextual: ContextualAnalysis;
  market: MarketAnalysis;
}
Returns: {
  success: boolean;
  decision: DeepAnalysisResult;
}
```

## Helper Functions

Location: `/src/lib/analysis/helpers.ts`

### Data Extraction Functions

#### extractBasicInfo
```typescript
extractBasicInfo(dataPool: DataPool): BasicInfo[]
```
Extracts institution, budget, and person count from entities.

**Example:**
```typescript
const basicInfo = extractBasicInfo(dataPool);
// Returns:
[
  { label: 'Kurum', value: 'Sağlık Bakanlığı', source: { filename: 'ihale.pdf', page_number: 1 } },
  { label: 'Bütçe', value: '1.500.000 TL', source: { filename: 'ihale.pdf', page_number: 3 } },
  { label: 'Kişi Sayısı', value: '500', source: { filename: 'menu.pdf', page_number: 2 } }
]
```

#### extractCriticalDates
```typescript
extractCriticalDates(dataPool: DataPool): CriticalDate[]
```
Organizes dates chronologically with descriptions.

**Example:**
```typescript
const dates = extractCriticalDates(dataPool);
// Returns dates sorted by date, each with source reference
```

#### groupByDocument
```typescript
groupByDocument(dataPool: DataPool): Map<string, TextBlock[]>
```
Groups text blocks by their source document.

#### extractDetails
```typescript
extractDetails(dataPool: DataPool): Details
```
Identifies locations, authorities, and special conditions.

### Table Categorization Functions

#### categorizeAllTables
```typescript
categorizeAllTables(tables: Table[]): CategorizedTables
```
Auto-categorizes tables into menu, cost, personnel, technical, and other.

**Example:**
```typescript
const categorized = categorizeAllTables(dataPool.tables);
// Returns:
{
  menu: [...],      // Green color
  cost: [...],      // Blue color
  personnel: [...], // Purple color
  technical: [...], // Orange color
  other: [...]      // Gray color
}
```

#### Category Check Functions
```typescript
isMenuTable(headers: string[]): boolean
isCostTable(headers: string[]): boolean
isPersonnelTable(headers: string[]): boolean
isTechnicalTable(headers: string[]): boolean
```

**Header Patterns:**
- **Menu**: Contains "yemek", "menü", "öğün", "porsiyon", "kalori"
- **Cost**: Contains "maliyet", "fiyat", "tutar", "ücret", "bedel"
- **Personnel**: Contains "personel", "çalışan", "kadro", "pozisyon"
- **Technical**: Contains "teknik", "şartname", "özellik", "standart"

### Utility Functions

#### highlightSearchTerm
```typescript
highlightSearchTerm(text: string, searchTerm: string): JSX.Element
```
Highlights search matches in text with yellow background.

#### formatSourceRef
```typescript
formatSourceRef(source: SourceReference): string
```
Formats source as "filename:page".

## Usage Examples

### Extracting and Displaying Basic Information
```typescript
import { extractBasicInfo } from '@/lib/analysis/helpers';

function BasicInfoDisplay({ dataPool }: Props) {
  const basicInfo = extractBasicInfo(dataPool);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {basicInfo.map((info, i) => (
        <div key={i} className="glass-card p-4">
          <div className="text-xs text-slate-400">{info.label}</div>
          <div className="text-lg font-semibold text-white">{info.value}</div>
          <div className="text-xs text-slate-500 mt-1">
            📄 {info.source.filename}:{info.source.page_number}
          </div>
        </div>
      ))}
    </div>
  );
}
```

### Categorizing and Displaying Tables
```typescript
import { categorizeAllTables } from '@/lib/analysis/helpers';

function CategorizedTableDisplay({ tables }: Props) {
  const categorized = useMemo(() => {
    return categorizeAllTables(tables);
  }, [tables]);

  const categoryConfig = {
    menu: { color: 'green', icon: '🍽️', label: 'Menü ve Gıda' },
    cost: { color: 'blue', icon: '💰', label: 'Maliyet' },
    personnel: { color: 'purple', icon: '👥', label: 'Personel' },
    technical: { color: 'orange', icon: '⚙️', label: 'Teknik' }
  };

  return (
    <div className="space-y-6">
      {Object.entries(categorized).map(([category, tables]) => {
        if (tables.length === 0) return null;
        const config = categoryConfig[category];

        return (
          <div key={category}>
            <h3 className={`text-${config.color}-400`}>
              {config.icon} {config.label} ({tables.length})
            </h3>
            {/* Render tables */}
          </div>
        );
      })}
    </div>
  );
}
```

### Implementing Search with Highlighting
```typescript
import { highlightSearchTerm } from '@/lib/analysis/helpers';

function SearchableContent({ text, searchTerm }: Props) {
  if (!searchTerm) return <span>{text}</span>;

  return highlightSearchTerm(text, searchTerm);
}
```

### Exporting Tables to CSV
```typescript
function exportTableToCSV(table: Table) {
  const headers = table.headers.join(',');
  const rows = table.rows.map(row =>
    row.cells.map(cell => `"${cell}"`).join(',')
  ).join('\n');

  const csv = `${headers}\n${rows}`;
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = `${table.title || 'table'}.csv`;
  link.click();

  URL.revokeObjectURL(url);
}
```

## Best Practices

### 1. Always Include Source References
```typescript
// ✅ Good
return {
  value: extractedValue,
  source: {
    filename: document.filename,
    page_number: entity.page_number
  }
};

// ❌ Bad
return { value: extractedValue };
```

### 2. Use Memoization for Heavy Operations
```typescript
const categorizedTables = useMemo(() => {
  return categorizeAllTables(tables);
}, [tables]);
```

### 3. Implement Proper Loading States
```typescript
if (loading) {
  return <LoadingState message="Analiz yükleniyor..." />;
}

if (error) {
  return <ErrorState error={error} />;
}
```

### 4. Color Coding Convention
- **Green** (green-400): Menu and food related
- **Blue** (blue-400): Cost and financial
- **Purple** (purple-400): Personnel and HR
- **Orange** (orange-400): Technical specifications
- **Gray** (gray-400): Uncategorized/Other

### 5. Export Functionality
Always provide export options for tables:
```typescript
<button onClick={() => exportToCSV(table)}>
  <Download className="w-4 h-4" />
  CSV İndir
</button>
```

## Troubleshooting

### Issue: Missing Source References
**Problem:** Data displayed without source information
**Solution:** Ensure all extraction functions include source tracking:
```typescript
source: {
  filename: doc.filename,
  page_number: entity.page_number || 1
}
```

### Issue: Tables Not Categorizing
**Problem:** Tables showing as "other" category
**Solution:** Check table headers and update category detection:
```typescript
// Add new patterns to helper functions
if (headers.some(h => h.toLowerCase().includes('new_pattern'))) {
  return 'appropriate_category';
}
```

### Issue: Search Not Working
**Problem:** Search term not filtering results
**Solution:** Ensure searchTerm is properly passed and used:
```typescript
const filtered = data.filter(item =>
  item.text.toLowerCase().includes(searchTerm.toLowerCase())
);
```

### Issue: Large Tables Performance
**Problem:** UI freezes with large tables
**Solution:** Implement pagination or virtual scrolling:
```typescript
const ITEMS_PER_PAGE = 20;
const paginatedData = data.slice(
  page * ITEMS_PER_PAGE,
  (page + 1) * ITEMS_PER_PAGE
);
```

### Issue: Export Not Working
**Problem:** CSV export creates malformed files
**Solution:** Properly escape special characters:
```typescript
const escapeCSV = (text: string) => {
  if (text.includes(',') || text.includes('"') || text.includes('\n')) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
};
```

## Advanced Features

### Full-Screen Table Modal
The TableFullScreenModal component provides:
- 20-row pagination
- Column sorting
- Search within table
- Export to CSV/Excel
- Keyboard navigation (ESC to close)

### Data Pool Persistence
Analysis results are stored in:
- Zustand store (analysisStore.ts)
- LocalStorage for persistence
- SQLite database for long-term storage

### Real-Time Updates
Using the notification system:
```typescript
// Send notification when analysis completes
await sendNotification({
  type: 'success',
  title: 'Analiz Tamamlandı',
  message: 'İhale analizi başarıyla tamamlandı'
});
```

## Performance Optimization

### 1. Lazy Loading Components
```typescript
const TableFullScreenModal = dynamic(
  () => import('./TableFullScreenModal'),
  { ssr: false }
);
```

### 2. Virtual Scrolling for Large Lists
```typescript
import { FixedSizeList } from 'react-window';

<FixedSizeList
  height={600}
  itemCount={items.length}
  itemSize={50}
  width="100%"
>
  {Row}
</FixedSizeList>
```

### 3. Debounced Search
```typescript
const debouncedSearch = useMemo(
  () => debounce((term: string) => setSearchTerm(term), 300),
  []
);
```

## Security Considerations

### 1. Sanitize HTML Content
```typescript
import DOMPurify from 'isomorphic-dompurify';

const sanitized = DOMPurify.sanitize(htmlContent);
```

### 2. Validate File Uploads
```typescript
const ALLOWED_TYPES = ['application/pdf', 'text/csv', 'application/vnd.ms-excel'];

if (!ALLOWED_TYPES.includes(file.type)) {
  throw new Error('Invalid file type');
}
```

### 3. Source Reference Validation
```typescript
// Ensure page numbers are valid
const pageNumber = Math.max(1, entity.page_number || 1);
```

---

## Summary

The Procheff-v3 Analysis System provides:
- **Comprehensive Data Organization**: 3-tab structure with sub-tabs
- **Full Traceability**: Source tracking on every data point
- **Intelligent Categorization**: Automatic table classification
- **Export Capabilities**: CSV and Excel export for all data
- **Search Functionality**: Full-text search with highlighting
- **Professional UI**: Glassmorphism theme with responsive design

For implementation questions, refer to the source code or contact the development team.

---

**Last Updated**: 11 Kasım 2025
**Version**: 3.5.0