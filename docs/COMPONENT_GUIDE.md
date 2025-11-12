# React Component Library Guide

**Complete reference for all React components in Procheff-v3**

This guide documents all 40+ components with props, usage examples, and best practices.

**Last Updated**: 2025-01-12

---

## 📚 Table of Contents

- [Analysis Components](#analysis-components)
- [UI Components](#ui-components)
- [Chat Components](#chat-components)
- [Market Components](#market-components)
- [Monitoring Components](#monitoring-components)
- [Pipeline Components](#pipeline-components)
- [Shell Components](#shell-components)
- [Tender Components](#tender-components)

---

## Analysis Components

### RawDataView

**File**: `src/components/analysis/RawDataView.tsx`

Displays raw extracted data with source tracking and logical grouping.

**Props:**
```typescript
interface RawDataViewProps {
  dataPool: DataPool;
  searchTerm?: string;
}
```

**Usage:**
```tsx
import { RawDataView } from '@/components/analysis/RawDataView';

<RawDataView 
  dataPool={dataPool} 
  searchTerm="tavuk" 
/>
```

**Features:**
- Logical grouping (basic info, critical dates, documents)
- Source tracking (file:page references)
- Expandable document sections
- Raw text toggle
- Search highlighting

### TablesView

**File**: `src/components/analysis/TablesView.tsx`

Displays categorized tables (menu, cost, personnel, technical).

**Props:**
```typescript
interface TablesViewProps {
  dataPool: DataPool;
  searchTerm?: string;
}
```

**Usage:**
```tsx
import { TablesView } from '@/components/analysis/TablesView';

<TablesView 
  dataPool={dataPool} 
  searchTerm="maliyet" 
/>
```

**Features:**
- Auto-categorization
- Color-coded categories
- Full-screen modal viewer
- CSV/Excel export
- Pagination

### ContextualView

**File**: `src/components/analysis/ContextualView.tsx`

Displays contextual (risk) analysis results.

**Props:**
```typescript
interface ContextualViewProps {
  contextualAnalysis: ContextualAnalysis;
}
```

**Usage:**
```tsx
import { ContextualView } from '@/components/analysis/ContextualView';

<ContextualView contextualAnalysis={analysis} />
```

**Features:**
- Risk scoring
- Cost deviation analysis
- Time suitability evaluation
- Visual indicators

### TableFullScreenModal

**File**: `src/components/analysis/TableFullScreenModal.tsx`

Full-screen table viewer with pagination.

**Props:**
```typescript
interface TableFullScreenModalProps {
  table: Table;
  isOpen: boolean;
  onClose: () => void;
}
```

**Usage:**
```tsx
import { TableFullScreenModal } from '@/components/analysis/TableFullScreenModal';

<TableFullScreenModal 
  table={table} 
  isOpen={isOpen} 
  onClose={() => setIsOpen(false)} 
/>
```

### AnalysisProgressTracker

**File**: `src/components/analysis/AnalysisProgressTracker.tsx`

Tracks and displays analysis progress.

**Props:**
```typescript
interface AnalysisProgressTrackerProps {
  stage: AnalysisStage;
  progress: number;
}
```

### LogViewer

**File**: `src/components/analysis/LogViewer.tsx`

Displays system logs with filtering.

**Props:**
```typescript
interface LogViewerProps {
  logs?: Log[];
  autoRefresh?: boolean;
}
```

### PaginatedTextViewer

**File**: `src/components/analysis/PaginatedTextViewer.tsx`

Paginated text viewer for large content.

**Props:**
```typescript
interface PaginatedTextViewerProps {
  text: string;
  itemsPerPage?: number;
  searchTerm?: string;
}
```

### PaginatedTablesViewer

**File**: `src/components/analysis/PaginatedTablesViewer.tsx`

Paginated table viewer.

**Props:**
```typescript
interface PaginatedTablesViewerProps {
  tables: Table[];
  itemsPerPage?: number;
}
```

### CSVCostAnalysis

**File**: `src/components/analysis/CSVCostAnalysis.tsx`

Cost analysis visualization from CSV data.

**Props:**
```typescript
interface CSVCostAnalysisProps {
  costData: CostData[];
}
```

---

## UI Components

### CommandPalette

**File**: `src/components/ui/CommandPalette.tsx`

AI-powered command palette (Cmd/Ctrl+K).

**Features:**
- Quick navigation
- AI queries
- Keyboard-first navigation
- Fuzzy search

**Usage:**
```tsx
import { CommandPalette } from '@/components/ui/CommandPalette';

<CommandPalette />
```

**Keyboard Shortcuts:**
- `Cmd/Ctrl + K` - Open/close
- `↑` `↓` - Navigate
- `Enter` - Select
- `ESC` - Close

### Breadcrumb

**File**: `src/components/ui/Breadcrumb.tsx`

Navigation breadcrumb component.

**Props:**
```typescript
interface BreadcrumbProps {
  items?: BreadcrumbItem[];
}
```

### Button

**File**: `src/components/ui/button.tsx`

Styled button component with variants.

**Props:**
```typescript
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}
```

**Usage:**
```tsx
import { Button } from '@/components/ui/button';

<Button variant="primary" size="md">
  Click Me
</Button>
```

### Card

**File**: `src/components/ui/card.tsx`

Glassmorphism card component.

**Usage:**
```tsx
import { Card } from '@/components/ui/card';

<Card className="glass-card">
  <h2>Card Title</h2>
  <p>Card content</p>
</Card>
```

### ExportButtons

**File**: `src/components/ui/ExportButtons.tsx`

Export buttons for CSV/Excel.

**Props:**
```typescript
interface ExportButtonsProps {
  data: any[];
  filename?: string;
  onExport?: (format: 'csv' | 'xlsx') => void;
}
```

### LoadingState

**File**: `src/components/ui/LoadingState.tsx`

Loading spinner component.

**Props:**
```typescript
interface LoadingStateProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
}
```

### ErrorState

**File**: `src/components/ui/ErrorState.tsx`

Error display component.

**Props:**
```typescript
interface ErrorStateProps {
  error: Error | string;
  onRetry?: () => void;
}
```

### EmptyState

**File**: `src/components/ui/EmptyState.tsx`

Empty state component.

**Props:**
```typescript
interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
}
```

### Skeleton

**File**: `src/components/ui/Skeleton.tsx`

Loading skeleton component.

**Usage:**
```tsx
import { Skeleton } from '@/components/ui/Skeleton';

<Skeleton className="h-4 w-full" />
```

### StatCard

**File**: `src/components/ui/StatCard.tsx`

Statistics card component.

**Props:**
```typescript
interface StatCardProps {
  title: string;
  value: string | number;
  icon?: React.ReactNode;
  trend?: { value: number; isPositive: boolean };
}
```

### MetricCard

**File**: `src/components/ui/MetricCard.tsx`

Metric display card.

**Props:**
```typescript
interface MetricCardProps {
  label: string;
  value: number;
  unit?: string;
  color?: string;
}
```

### PipelineProgress

**File**: `src/components/ui/PipelineProgress.tsx`

Pipeline progress indicator.

**Props:**
```typescript
interface PipelineProgressProps {
  currentStep: PipelineStep;
  completedSteps: PipelineStep[];
}
```

### PipelineNavigator

**File**: `src/components/ui/PipelineNavigator.tsx`

Pipeline navigation component.

**Props:**
```typescript
interface PipelineNavigatorProps {
  onStepChange: (step: PipelineStep) => void;
}
```

### QuickPipelineAction

**File**: `src/components/ui/QuickPipelineAction.tsx`

Quick action button for pipeline.

**Props:**
```typescript
interface QuickPipelineActionProps {
  onStart: () => void;
  disabled?: boolean;
}
```

### Input

**File**: `src/components/ui/input.tsx`

Styled input component.

**Props:**
```typescript
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}
```

### Badge

**File**: `src/components/ui/badge.tsx`

Badge component.

**Props:**
```typescript
interface BadgeProps {
  variant?: 'default' | 'success' | 'warning' | 'error';
  children: React.ReactNode;
}
```

### Toast

**File**: `src/components/ui/Toast.tsx`

Toast notification component (uses Sonner).

---

## Chat Components

### ChatInterface

**File**: `src/components/chat/ChatInterface.tsx`

Main chat interface with message list.

**Features:**
- Message display
- Auto-scroll
- Empty state
- Streaming support

**Usage:**
```tsx
import { ChatInterface } from '@/components/chat/ChatInterface';

<ChatInterface />
```

### MessageBubble

**File**: `src/components/chat/MessageBubble.tsx`

Individual message bubble.

**Props:**
```typescript
interface MessageBubbleProps {
  message: Message;
}
```

### InputArea

**File**: `src/components/chat/InputArea.tsx`

Chat input area.

**Props:**
```typescript
interface InputAreaProps {
  onSend: (message: string) => void;
  disabled?: boolean;
}
```

### ContextWidgets

**File**: `src/components/chat/ContextWidgets.tsx`

Context widgets for chat (Alerts, Metrics, Price).

**Exports:**
- `AlertsWidget`
- `MetricsWidget`
- `PriceWidget`

---

## Market Components

### BulkUploader

**File**: `src/components/market/BulkUploader.tsx`

Bulk product price uploader.

### PriceCard

**File**: `src/components/market/PriceCard.tsx`

Product price display card.

**Props:**
```typescript
interface PriceCardProps {
  product: string;
  price: number;
  unit: string;
  source: string;
}
```

### TrendChart

**File**: `src/components/market/TrendChart.tsx`

Price trend chart (uses Recharts).

**Props:**
```typescript
interface TrendChartProps {
  data: PriceDataPoint[];
  product: string;
}
```

---

## Monitoring Components

### CacheMetricsCard

**File**: `src/components/monitoring/CacheMetricsCard.tsx`

Cache performance metrics.

### RateLimitCard

**File**: `src/components/monitoring/RateLimitCard.tsx`

Rate limit status card.

### RedisHealthIndicator

**File**: `src/components/monitoring/RedisHealthIndicator.tsx`

Redis connection health indicator.

---

## Pipeline Components

### LiveLogFeed

**File**: `src/components/pipeline/LiveLogFeed.tsx`

Live log feed for pipeline execution.

**Props:**
```typescript
interface LiveLogFeedProps {
  jobId: string;
  autoRefresh?: boolean;
}
```

### PipelineTimeline

**File**: `src/components/pipeline/PipelineTimeline.tsx`

Timeline visualization of pipeline steps.

**Props:**
```typescript
interface PipelineTimelineProps {
  steps: PipelineStep[];
  currentStep: PipelineStep;
}
```

---

## Shell Components

### AppShell

**File**: `src/components/shell/AppShell.tsx`

Main application shell layout.

**Props:**
```typescript
interface AppShellProps {
  children: React.ReactNode;
}
```

### ModernSidebar

**File**: `src/components/shell/ModernSidebar.tsx`

Modern sidebar navigation.

**Features:**
- Collapsible
- Active route highlighting
- Notification badge
- User menu

### TopBar

**File**: `src/components/shell/TopBar.tsx`

Top navigation bar.

### UserMenu

**File**: `src/components/shell/UserMenu.tsx`

User menu dropdown.

---

## Tender Components

### ReplicaFrame

**File**: `src/components/tender/ReplicaFrame.tsx`

Iframe for displaying tender content.

**Props:**
```typescript
interface ReplicaFrameProps {
  url: string;
  title?: string;
}
```

### TenderDetailDisplay

**File**: `src/components/tender/TenderDetailDisplay.tsx`

Tender detail display component.

**Props:**
```typescript
interface TenderDetailDisplayProps {
  tender: Tender;
}
```

---

## Best Practices

### Component Usage

1. **Import from correct path**: Always use `@/components/...` alias
2. **Type safety**: Use TypeScript interfaces for props
3. **Error handling**: Wrap in ErrorBoundary for critical components
4. **Loading states**: Always show loading indicators
5. **Accessibility**: Include ARIA labels and keyboard support

### Styling

- Use Tailwind CSS utility classes
- Apply `glass-card` class for glassmorphism effect
- Use `btn-gradient` for gradient buttons
- Follow dark theme color scheme

### Performance

- Use `useMemo` for expensive computations
- Use `useCallback` for event handlers passed to children
- Lazy load heavy components
- Optimize re-renders with React.memo when needed

---

**Last Updated**: 2025-01-12  
**Total Components**: 40+  
**Maintained By**: Procheff-v3 Development Team


