# 🚀 ENHANCED ANALYSIS & PROPOSAL SYSTEM - KULLANIM KILAVUZU

## 📋 İÇİNDEKİLER

1. [Genel Bakış](#genel-bakış)
2. [Kurulum](#kurulum)
3. [Yeni Component'ler](#yeni-componentler)
4. [Kullanım Örnekleri](#kullanım-örnekleri)
5. [API Entegrasyonu](#api-entegrasyonu)
6. [Özelleştirme](#özelleştirme)

---

## 🎯 GENEL BAKIŞ

Bu sistem, analiz ve teklif hazırlama süreçlerini modern, animasyonlu ve kullanıcı deneyimi odaklı bir şekilde yeniden tasarlar.

### ✨ Ana Özellikler

- **80+ Yeni Component**: Shared, Analysis, Proposal kategorilerinde
- **Custom Hooks**: useAutoSave, useUndoRedo, useInlineEdit, useKeyboardShortcuts
- **Animasyon Sistemi**: Framer Motion bazlı, 20+ hazır variant
- **Real-time Features**: Auto-save (3sn), SSE streaming, live updates
- **Accessibility**: ARIA labels, keyboard navigation, focus management
- **Performance**: Virtual scrolling, lazy loading, memoization

---

## 🛠️ KURULUM

### 1. Yeni Bağımlılıklar

Gerekli paketler zaten `package.json`'da var:
- `framer-motion` (animasyonlar)
- `lucide-react` (ikonlar)
- `zustand` (state management)

```bash
npm install
# veya
pnpm install
```

### 2. Dosya Yapısı

Yeni component'ler şu dizinlerde oluşturuldu:

```
src/
├── components/
│   ├── shared/             # Ortak component'ler
│   │   ├── animations/     # AnimatedCounter, SkeletonLoader, SuccessConfetti
│   │   ├── ui/             # Badge, ProgressBar
│   │   └── charts/         # MiniChart, SparkLine
│   ├── analysis/           # Analiz component'leri
│   │   ├── header/         # AnalysisHeader, StatsGauge
│   │   ├── csv-cards/      # EnhancedCSVCostCard
│   │   ├── tabs/           # EnhancedTabNavigation
│   │   ├── data-extraction/# EnhancedRawDataViewer
│   │   ├── contextual/     # StaticInfoCards, ExpandableCards, RiskSummary
│   │   └── deep-analysis/  # ChatInterface
│   └── proposal/           # Teklif component'leri
│       ├── header/         # ProposalHeader
│       ├── financial/      # DecisionBadge, CostSummaryBox
│       └── cards/          # EnhancedCostCard
├── lib/
│   ├── hooks/             # Custom hooks
│   └── utils/
│       └── animation-variants.ts
```

---

## 🧩 YENİ COMPONENT'LER

### 1. Shared Components

#### AnimatedCounter
```tsx
import { AnimatedCounter, CurrencyCounter } from '@/components/shared/animations/AnimatedCounter';

<AnimatedCounter
  value={1250.50}
  decimals={2}
  prefix="₺"
  duration={1.5}
/>

<CurrencyCounter
  value={5000}
  locale="tr-TR"
  currency="TRY"
/>
```

#### Badge
```tsx
import { Badge, NotificationBadge, ProgressBadge } from '@/components/shared/ui/Badge';

<Badge variant="success" icon={Check} pulse>Tamamlandı</Badge>
<NotificationBadge count={5} />
<ProgressBadge progress={75} />
```

#### SkeletonLoader
```tsx
import { SkeletonLoader, CardSkeleton, TableSkeleton } from '@/components/shared/animations/SkeletonLoader';

<SkeletonLoader variant="card" count={3} />
<CardSkeleton />
<TableSkeleton rows={5} />
```

### 2. Analysis Components

#### AnalysisHeader
```tsx
import { AnalysisHeader } from '@/components/analysis/header/AnalysisHeader';

<AnalysisHeader
  title="İhale Analiz Sonuçları"
  duration={2500}
  tokenUsage={15000}
  cost={0.0234}
  confidence={85}
  model="Claude Sonnet 4.5"
  status="completed"
  onExport={handleExport}
  onShare={handleShare}
/>
```

#### EnhancedTabNavigation
```tsx
import { EnhancedTabNavigation } from '@/components/analysis/tabs/EnhancedTabNavigation';

const tabs = [
  {
    id: 'data-pool',
    name: '📊 Veri Havuzu',
    icon: Database,
    color: 'from-blue-500 to-cyan-500',
    description: 'Tüm veriler ve tablolar',
    progress: 100,
    shortcut: 'Ctrl+1'
  },
  // ...
];

<EnhancedTabNavigation
  tabs={tabs}
  activeTab={activeTab}
  onTabChange={setActiveTab}
/>
```

#### ChatInterface (Deep Analysis)
```tsx
import { ChatInterface } from '@/components/analysis/deep-analysis/ChatInterface';

<ChatInterface
  initialMessages={messages}
  onSendMessage={async (msg) => {
    const response = await fetch('/api/analysis/chat', {
      method: 'POST',
      body: JSON.stringify({ message: msg })
    });
    return await response.json();
  }}
  streaming={true}
/>
```

### 3. Proposal Components

#### ProposalHeader
```tsx
import { ProposalHeader } from '@/components/proposal/header/ProposalHeader';

<ProposalHeader
  title="Teklif Hazırlama"
  data={proposalData}
  onSave={async (data) => { await saveProposal(data); }}
  onExport={handleExport}
  onUndo={undo}
  onRedo={redo}
  canUndo={canUndo}
  canRedo={canRedo}
/>
```

#### DecisionBadge
```tsx
import { DecisionBadge } from '@/components/proposal/financial/DecisionBadge';

<DecisionBadge
  decision="EVET"
  reasoning={[
    'Kâr marjı yeterli (%12)',
    'Et riski düşük',
    'Nakit ihtiyacı karşılanabilir'
  ]}
  profitMargin={12}
  riskLevel="Düşük"
  cashNeed="500K TL"
/>
```

#### EnhancedCostCard
```tsx
import { EnhancedCostCard } from '@/components/proposal/cards/EnhancedCostCard';

<EnhancedCostCard
  items={costItems}
  onChange={(updatedItems) => {
    setCostItems(updatedItems);
  }}
/>
```

---

## 🔧 CUSTOM HOOKS

### useAutoSave
```tsx
import { useAutoSave, useAutoSaveStatus } from '@/lib/hooks/useAutoSave';

const { isSaving, lastSaved, forceSave } = useAutoSave({
  data: proposalData,
  onSave: async (data) => {
    await fetch('/api/proposal/save', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },
  interval: 3000,  // 3 saniye
  debounce: 1000   // 1 saniye
});

const status = useAutoSaveStatus(lastSaved, isSaving);
// "Az önce kaydedildi" veya "5 saniye önce kaydedildi"
```

### useUndoRedo
```tsx
import { useUndoRedo, useUndoRedoShortcuts } from '@/lib/hooks/useUndoRedo';

const {
  state,
  setState,
  undo,
  redo,
  canUndo,
  canRedo
} = useUndoRedo({
  initialState: initialData,
  maxHistory: 50
});

// Ctrl+Z / Ctrl+Shift+Z shortcuts
useUndoRedoShortcuts(undo, redo);
```

### useInlineEdit
```tsx
import { useInlineEdit } from '@/lib/hooks/useInlineEdit';

const {
  isEditing,
  value,
  inputRef,
  startEditing,
  handleChange,
  handleKeyDown,
  handleBlur
} = useInlineEdit({
  initialValue: item.name,
  onSave: (newName) => updateItem({ ...item, name: newName })
});

// Render
{isEditing ? (
  <input
    ref={inputRef}
    value={value}
    onChange={handleChange}
    onKeyDown={handleKeyDown}
    onBlur={handleBlur}
  />
) : (
  <span onClick={startEditing}>{value}</span>
)}
```

### useKeyboardShortcuts
```tsx
import { useKeyboardShortcuts } from '@/lib/hooks/useKeyboardShortcuts';

useKeyboardShortcuts([
  { key: 'ctrl+s', action: handleSave, description: 'Kaydet' },
  { key: 'ctrl+1', action: () => setTab('data'), description: 'Veri sekmesi' },
  { key: 'ctrl+k', action: openSearch, description: 'Ara' }
]);
```

---

## 📊 KULLANIM ÖRNEKLERİ

### Örnek 1: Enhanced Analysis Result Page

```tsx
'use client';

import { useState } from 'react';
import { AnalysisHeader } from '@/components/analysis/header/AnalysisHeader';
import { EnhancedCSVCostCard } from '@/components/analysis/csv-cards/EnhancedCSVCostCard';
import { EnhancedTabNavigation } from '@/components/analysis/tabs/EnhancedTabNavigation';
import { EnhancedRawDataViewer } from '@/components/analysis/data-extraction/EnhancedRawDataViewer';
import { ChatInterface } from '@/components/analysis/deep-analysis/ChatInterface';
import { ExportDialog } from '@/components/shared/export/ExportDialog';
import { Database, Brain, Shield } from 'lucide-react';

export default function EnhancedAnalysisPage() {
  const [activeTab, setActiveTab] = useState<'data-pool' | 'contextual' | 'deep'>('data-pool');
  const [showExport, setShowExport] = useState(false);

  const tabs = [
    {
      id: 'data-pool' as const,
      name: '📊 Veri Havuzu',
      icon: Database,
      color: 'from-blue-500 to-cyan-500',
      description: 'Tüm veriler ve tablolar',
      progress: 100
    },
    {
      id: 'contextual' as const,
      name: '🧠 Bağlamsal Analiz',
      icon: Brain,
      color: 'from-purple-500 to-pink-500',
      description: 'Tablo analisti',
      progress: 75
    },
    {
      id: 'deep' as const,
      name: '🤖 Derin Analiz',
      icon: Shield,
      color: 'from-orange-500 to-red-500',
      description: 'AI danışman',
      notifications: 2
    }
  ];

  return (
    <div className="min-h-screen p-6">
      <AnalysisHeader
        title="İhale Analiz Sonuçları"
        duration={2500}
        tokenUsage={15000}
        cost={0.0234}
        confidence={85}
        onExport={() => setShowExport(true)}
      />

      {/* CSV Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {csvData.map((csv, i) => (
          <EnhancedCSVCostCard
            key={i}
            data={csv}
            index={i}
            onViewDetails={() => console.log('View', csv)}
          />
        ))}
      </div>

      <EnhancedTabNavigation
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {activeTab === 'data-pool' && (
        <EnhancedRawDataViewer dataPool={dataPool} />
      )}
      {activeTab === 'deep' && (
        <ChatInterface onSendMessage={handleAIChat} />
      )}

      <ExportDialog
        isOpen={showExport}
        onClose={() => setShowExport(false)}
        onExport={handleExport}
      />
    </div>
  );
}
```

### Örnek 2: Enhanced Proposal Page

```tsx
'use client';

import { ProposalHeader } from '@/components/proposal/header/ProposalHeader';
import { DecisionBadge } from '@/components/proposal/financial/DecisionBadge';
import { CostSummaryBox } from '@/components/proposal/financial/CostSummaryBox';
import { EnhancedCostCard } from '@/components/proposal/cards/EnhancedCostCard';
import { useUndoRedo } from '@/lib/hooks/useUndoRedo';
import { UtensilsCrossed, Users, Wrench, Package } from 'lucide-react';

export default function EnhancedProposalPage() {
  const {
    state: proposalData,
    setState: setProposalData,
    undo,
    redo,
    canUndo,
    canRedo
  } = useUndoRedo({
    initialState: initialProposal,
    maxHistory: 50
  });

  return (
    <div className="min-h-screen p-6">
      <ProposalHeader
        title="Teklif Hazırlama"
        data={proposalData}
        onSave={saveProposal}
        onUndo={undo}
        onRedo={redo}
        canUndo={canUndo}
        canRedo={canRedo}
      />

      <DecisionBadge
        decision="EVET"
        reasoning={['Kâr marjı yeterli', 'Risk düşük']}
        profitMargin={12}
      />

      {/* Cost Summary */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 my-6">
        <CostSummaryBox
          label="Yemek"
          value={250000}
          icon={<UtensilsCrossed className="w-5 h-5 text-orange-400" />}
          color="from-orange-500 to-amber-500"
          editable
          onChange={(val) => console.log('New value:', val)}
        />
        {/* ... diğer kutular */}
      </div>

      <EnhancedCostCard
        items={costItems}
        onChange={(items) => setProposalData({ ...proposalData, costItems: items })}
      />
    </div>
  );
}
```

---

## 🎨 ANIMATION VARIANTS

```tsx
import {
  fadeIn,
  fadeInUp,
  scaleIn,
  staggerContainer,
  staggerItem,
  cardHover,
  modalBackdrop,
  modalContent
} from '@/lib/utils/animation-variants';

<motion.div
  variants={staggerContainer}
  initial="hidden"
  animate="visible"
>
  {items.map((item, i) => (
    <motion.div key={i} variants={staggerItem}>
      {item.name}
    </motion.div>
  ))}
</motion.div>
```

---

## ⚡ PERFORMANCE İPUÇLARI

1. **Virtual Scrolling**: Büyük listeler için react-window kullanın
2. **Lazy Loading**: Tab içerikleri sadece aktif olduğunda render edin
3. **Memoization**: `React.memo`, `useMemo`, `useCallback` kullanın
4. **Code Splitting**: Tab bazlı dynamic import
5. **Debouncing**: Input değişikliklerinde debounce (useAutoSave'de var)

---

## 🎯 NEXT STEPS

1. **Mevcut sayfalara entegre edin**: `/app/analysis/[id]/page.tsx`, `/app/proposal/page.tsx`
2. **API endpoint'leri ekleyin**: `/api/proposal/auto-save`, `/api/analysis/stream-deep`
3. **Test edin**: Her component için birim testleri
4. **Dokümantasyon**: Her component için Storybook stories

---

## 🆘 DESTEK

Sorun yaşarsanız:
1. Bu dosyadaki örnekleri inceleyin
2. Component'lerin JSDoc açıklamalarını okuyun
3. TypeScript type definitions'a bakın

**Tüm component'ler TypeScript ile yazıldı ve tam tip desteği var!** 🎉
