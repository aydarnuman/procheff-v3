# 📊 Pipeline State Management Guide

## Overview

The Procheff-v3 pipeline state management system uses Zustand with localStorage persistence to ensure seamless data flow across all analysis steps without data loss.

## Architecture

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐     ┌──────────┐     ┌──────────┐
│ İhale List  │ --> │ İhale Detail │ --> │ Menu Parser │ --> │ Cost     │ --> │ Decision │
│  (Select)   │     │   (Review)   │     │  (Upload)   │     │ Analysis │     │  Engine  │
└─────────────┘     └──────────────┘     └─────────────┘     └──────────┘     └──────────┘
      ↓                    ↓                    ↓                  ↓               ↓
  [ Store ]            [ Store ]            [ Store ]          [ Store ]       [ Store ]
      ↑                    ↑                    ↑                  ↑               ↑
  localStorage         localStorage         localStorage     localStorage    localStorage
```

## Store Structure

### Location
`src/store/usePipelineStore.ts`

### State Interface
```typescript
interface PipelineState {
  // Step Tracking
  currentStep: PipelineStep;
  completedSteps: PipelineStep[];

  // Data Storage
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
  setCurrentStep: (step: PipelineStep) => void;
}
```

## Pipeline Steps

```typescript
export enum PIPELINE_STEPS {
  TENDER_SELECT = "TENDER_SELECT",    // İhale seçimi
  TENDER_DETAIL = "TENDER_DETAIL",    // İhale detay inceleme
  MENU_UPLOAD = "MENU_UPLOAD",        // Menü yükleme
  COST_ANALYSIS = "COST_ANALYSIS",    // Maliyet analizi
  DECISION = "DECISION",              // Karar verme
  PROPOSAL = "PROPOSAL"               // Teklif hazırlama
}
```

## Usage Examples

### 1. Starting a New Pipeline

```typescript
// In ihale list page
import { usePipelineStore } from "@/store/usePipelineStore";

function IhalePage() {
  const startNewPipeline = usePipelineStore(state => state.startNewPipeline);

  const handleSelectTender = (tender: Tender) => {
    // Store tender data and navigate to detail
    startNewPipeline(tender);
    router.push(`/ihale/${tender.id}`);
  };
}
```

### 2. Accessing Stored Data

```typescript
// In cost analysis page
function CostAnalysisPage() {
  const { selectedTender, menuData } = usePipelineStore();

  // Data is automatically available
  const analysisData = {
    kurum: selectedTender?.kurum || "",
    ihale_turu: selectedTender?.ihale_turu || "",
    menu_data: menuData || []
  };
}
```

### 3. Updating Pipeline Data

```typescript
// After successful API call
const response = await fetch('/api/ai/cost-analysis', {
  method: 'POST',
  body: JSON.stringify(requestData)
});

const result = await response.json();

// Store the analysis result
usePipelineStore.getState().updateCostAnalysis(result);

// Navigate to next step
router.push('/decision');
```

### 4. Progress Tracking

```typescript
// In any component
import { PipelineProgress } from "@/components/ui/PipelineProgress";

function PageWithProgress() {
  return (
    <>
      <PipelineProgress /> {/* Shows current step and completed steps */}
      {/* Page content */}
    </>
  );
}
```

## Data Persistence

### How It Works

1. **Automatic Save**: All state changes are automatically saved to localStorage
2. **Key**: Data is stored under `pipeline-storage` key
3. **Hydration**: On page load, data is restored from localStorage
4. **Cross-Tab**: Data persists across browser tabs

### localStorage Structure

```json
{
  "state": {
    "currentStep": "COST_ANALYSIS",
    "completedSteps": ["TENDER_SELECT", "TENDER_DETAIL", "MENU_UPLOAD"],
    "selectedTender": {
      "id": "123",
      "kurum": "Example Institution",
      "ihale_turu": "Yemek",
      "kisilik": 500
    },
    "menuData": [...],
    "costAnalysis": null,
    "decision": null
  },
  "version": 0
}
```

## Navigation Flow

### Forward Navigation
```typescript
// Each page has a "Continue" button
<button onClick={() => {
  // Update step
  setCurrentStep(PIPELINE_STEPS.COST_ANALYSIS);
  // Navigate
  router.push('/cost-analysis');
}}>
  Maliyet Analizine Geç
</button>
```

### Backward Navigation
```typescript
// Users can go back to review/edit
<button onClick={() => router.push('/menu-parser')}>
  Menüyü Düzenle
</button>
```

### Reset Pipeline
```typescript
// Start fresh analysis
<button onClick={() => {
  resetPipeline();
  router.push('/ihale');
}}>
  Yeni Analiz Başlat
</button>
```

## Components

### PipelineProgress Component

Shows visual progress through the pipeline:

```typescript
<PipelineProgress />
```

Features:
- Visual step indicators
- Completed step checkmarks
- Current step highlighting
- Animated progress line

### LoadingState Component

Unified loading indicator:

```typescript
<LoadingState
  message="Analiz yapılıyor..."
  description="Bu işlem birkaç dakika sürebilir"
/>
```

### ErrorState Component

Consistent error handling:

```typescript
<ErrorState
  title="Hata Oluştu"
  error={error.message}
  onRetry={handleRetry}
/>
```

### EmptyState Component

Empty data states with actions:

```typescript
<EmptyState
  icon={FileText}
  title="Henüz menü yüklenmedi"
  description="Devam etmek için menü dosyasını yükleyin"
  action={{
    label: "Menü Yükle",
    onClick: () => router.push('/menu-parser')
  }}
/>
```

## Benefits

1. **No Data Loss**: Data persists across page refreshes and navigation
2. **Automatic Flow**: Each step has access to previous step data
3. **User-Friendly**: Users can review and edit previous steps
4. **Progress Tracking**: Visual indicators show completion status
5. **Type Safety**: Full TypeScript support with interfaces
6. **Performance**: Local storage is faster than API calls
7. **Offline Support**: Works without network connection

## Best Practices

### 1. Always Check Data Availability

```typescript
// Good
const { selectedTender } = usePipelineStore();

if (!selectedTender) {
  return <EmptyState title="İhale seçilmedi" />;
}

// Use selectedTender safely
```

### 2. Update Step Progress

```typescript
// When entering a page
useEffect(() => {
  setCurrentStep(PIPELINE_STEPS.COST_ANALYSIS);
}, []);
```

### 3. Clean Up on Logout

```typescript
// In logout handler
const handleLogout = () => {
  resetPipeline(); // Clear pipeline data
  signOut();
};
```

### 4. Handle Navigation Guards

```typescript
// Prevent accessing steps out of order
if (!menuData) {
  router.push('/menu-parser');
  return null;
}
```

## Troubleshooting

### Data Not Persisting

Check browser localStorage:
```javascript
// In browser console
localStorage.getItem('pipeline-storage')
```

### State Not Updating

Ensure using proper Zustand patterns:
```typescript
// Correct
const updateMenuData = usePipelineStore(state => state.updateMenuData);

// Incorrect (creates new subscription)
const store = usePipelineStore();
store.updateMenuData(data);
```

### Hydration Issues

If SSR causes hydration mismatch:
```typescript
const [mounted, setMounted] = useState(false);

useEffect(() => {
  setMounted(true);
}, []);

if (!mounted) return <LoadingState />;
```

## Migration from Props/Context

### Before (Props Drilling)
```typescript
// Parent
<ChildComponent tender={tender} menu={menu} />

// Child
<GrandchildComponent tender={tender} menu={menu} />
```

### After (Zustand Store)
```typescript
// Any component at any level
const { selectedTender, menuData } = usePipelineStore();
```

## Future Enhancements

1. **Session Storage Option**: For sensitive data
2. **Encryption**: Encrypt localStorage data
3. **Versioning**: Handle store schema migrations
4. **Sync**: Multi-device synchronization
5. **Undo/Redo**: Step history management
6. **Draft Saving**: Auto-save incomplete forms

---

Last Updated: 11 Kasım 2025