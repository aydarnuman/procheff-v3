# Procheff-v3 Cleanup Actions - Actionable Fixes

**Purpose**: Step-by-step instructions to fix identified issues  
**Estimated Effort**: 15-20 minutes  
**Risk Level**: LOW (non-breaking changes)

---

## Priority Matrix

```
┌──────────────────────────────────────────────────────────┐
│ 🔴 P0 CRITICAL                                           │
│ ├─ Batch route references cause 404 errors in production │
│ └─ Must fix before deployment                            │
├──────────────────────────────────────────────────────────┤
│ 🟡 P1 HIGH                                               │
│ ├─ Duplicate file causes confusion                       │
│ ├─ Unused exports in utilities                           │
│ └─ Should fix in current sprint                          │
├──────────────────────────────────────────────────────────┤
│ 🟢 P2 MEDIUM                                             │
│ ├─ Unused store files for future use                     │
│ ├─ Experimental provider factory                         │
│ └─ Can fix in next cleanup sprint                        │
└──────────────────────────────────────────────────────────┘
```

---

## Action 1: Fix Deleted Batch Routes in UI (P0 - CRITICAL)

### 1.1 Fix `/src/app/page.tsx`

**Location**: Line 101  
**Current Code**:
```typescript
  const quickActions = [
    { label: 'Yeni Analiz Başlat', href: '/analysis', icon: Sparkles, color: 'indigo' },
    { label: 'İhale Listesi', href: '/ihale', icon: FileText, color: 'blue' },
    { label: 'Toplu İşlem', href: '/batch', icon: Package, color: 'purple' },  // ❌ DELETE THIS LINE
    { label: 'Raporlar', href: '/reports', icon: BarChart3, color: 'green' },
  ];
```

**Fix Options**:

**Option A**: Remove batch action entirely (RECOMMENDED)
```typescript
  const quickActions = [
    { label: 'Yeni Analiz Başlat', href: '/analysis', icon: Sparkles, color: 'indigo' },
    { label: 'İhale Listesi', href: '/ihale', icon: FileText, color: 'blue' },
    { label: 'Raporlar', href: '/reports', icon: BarChart3, color: 'green' },
  ];
```

**Option B**: Replace with another feature
```typescript
  { label: 'Sohbet Asistanı', href: '/chat', icon: MessageSquare, color: 'purple' },
```

**Verification After Fix**:
```bash
npm run lint  # Should pass
# Test homepage in browser - verify no 404 on quick actions
```

---

### 1.2 Fix `/src/components/ui/Breadcrumb.tsx`

**Location**: Lines 21-22  
**Current Code**:
```typescript
const pathNameMap: Record<string, string> = {
  "/": "Ana Sayfa",
  "/auto": "Oto Analiz",
  "/auto/history": "Geçmiş",
  "/ihale": "İhale",
  "/ihale/history": "Geçmiş",
  "/decision": "Karar Analizi",
  "/reports": "Raporlar",
  "/batch": "Toplu İşlem",        // ❌ DELETE THIS LINE
  "/batch/jobs": "İşler",         // ❌ DELETE THIS LINE
  "/menu-parser": "Menü Parser",
  // ...
};
```

**Fix**:
```typescript
const pathNameMap: Record<string, string> = {
  "/": "Ana Sayfa",
  "/auto": "Oto Analiz",
  "/auto/history": "Geçmiş",
  "/ihale": "İhale",
  "/ihale/history": "Geçmiş",
  "/decision": "Karar Analizi",
  "/reports": "Raporlar",
  // BATCH ENTRIES REMOVED
  "/menu-parser": "Menü Parser",
  // ... rest unchanged
};
```

**Why This Works**:
- Breadcrumb navigation won't crash if somehow user reaches /batch
- Dead entries won't clutter the pathNameMap
- If batch is re-implemented later, just add them back

**Verification**:
```bash
grep -n "/batch" src/components/ui/Breadcrumb.tsx
# Should return empty or no results
```

---

## Action 2: Remove Duplicate File (P1 - HIGH)

### 2.1 Delete smart-text-formatter.tsx

**Location**: `/src/lib/utils/smart-text-formatter.tsx`  
**Reason**: Identical duplicate of `.ts` version

**Current State**:
```
✅ smart-text-formatter.ts    (KEEP - actively imported)
❌ smart-text-formatter.tsx   (DELETE - dead duplicate)
```

**Verification Before Deletion**:
```bash
# Confirm they're identical
diff src/lib/utils/smart-text-formatter.ts src/lib/utils/smart-text-formatter.tsx
# Should show no differences

# Confirm only .ts is imported
grep -r "smart-text-formatter" src --include="*.ts*" | grep import
# Output should only show:
# src/components/analysis/PaginatedTextViewer.tsx:import { formatSmartText } from '@/lib/utils/smart-text-formatter';
```

**Delete Command**:
```bash
rm src/lib/utils/smart-text-formatter.tsx
```

**Verification After Deletion**:
```bash
# Should return NO results for .tsx version
find src -name "smart-text-formatter.tsx"

# Should still find the .ts version
find src -name "smart-text-formatter.ts"

# Build should succeed
npm run build
```

---

## Action 3: Remove Unused Functions from report-builder.ts (P1 - HIGH)

### 3.1 Identify Current State

**File**: `/src/lib/utils/report-builder.ts`  
**Current Exports**:
```typescript
// USED - Keep these:
export function buildReportPayload() { }
export function generateReportFilename() { }
export interface ReportPayload { }

// UNUSED - Remove these:
export function formatCurrency() { }
export function formatPercentage() { }
export interface AnalysisData { }
export interface CostData { }
export interface DecisionData { }
export interface MenuData { }
```

**Verification**:
```bash
# Check usage of each function
grep -r "formatCurrency" src --include="*.ts*" | grep -v "src/lib/utils/report-builder.ts"
# Should return: (no results)

grep -r "formatPercentage" src --include="*.ts*" | grep -v "src/lib/utils/report-builder.ts"
# Should return: (no results)

grep -r "AnalysisData\|CostData\|DecisionData\|MenuData" src --include="*.ts*" | grep -v "src/lib/utils/report-builder.ts"
# Should return: (no results)
```

### 3.2 Apply Cleanup

**Option A**: Remove entire unused functions (RECOMMENDED)

**Current Code** (lines 1-91):
```typescript
/**
 * Report Builder Utility
 * Combines analysis, cost, and decision data into unified report payload
 */

export interface AnalysisData {     // ❌ REMOVE
  kurum?: string;
  ihale_turu?: string;
  sure?: string;
  butce?: string;
  [key: string]: unknown;
}

export interface CostData {         // ❌ REMOVE
  gunluk_kisi_maliyeti?: string;
  // ... properties
}

export interface DecisionData {     // ❌ REMOVE
  karar?: "Katıl" | "Katılma" | "Dikkatli Katıl";
  // ... properties
}

export interface MenuData {         // ❌ REMOVE
  yemek: string;
  gramaj: number;
  ogun?: string;
  kisi?: number;
  kategori?: string;
}

export interface ReportPayload {    // ✅ KEEP
  // Temel Bilgiler
  kurum: string;
  ihale_turu: string;
  // ...
}

export function buildReportPayload() { }  // ✅ KEEP

export function formatCurrency() { }      // ❌ REMOVE
export function formatPercentage() { }    // ❌ REMOVE
export function generateReportFilename() {} // ✅ KEEP
```

**After Cleanup**:
```typescript
/**
 * Report Builder Utility
 * Combines analysis, cost, and decision data into unified report payload
 */

export interface ReportPayload {
  // Temel Bilgiler
  kurum: string;
  ihale_turu: string;
  sure: string;
  butce: string;

  // Maliyet Bilgileri
  gunluk_kisi_maliyeti: string;
  tahmini_toplam_gider: string;
  onerilen_karlilik_orani: string;
  riskli_kalemler: string[];
  maliyet_dagilimi: {
    hammadde: string;
    iscilik: string;
    genel_giderler: string;
    kar: string;
  };

  // Karar Bilgileri
  karar: string;
  risk_orani: string;
  tahmini_kar_orani: string;
  gerekce: string;
  stratejik_oneriler: string[];
  kritik_noktalar: string[];

  // Menü Bilgileri (opsiyonel)
  menu_items?: Array<{
    yemek: string;
    gramaj: number;
    ogun?: string;
    kisi?: number;
    kategori?: string;
  }>;
  toplam_gramaj?: number;
  kisi_sayisi?: number;

  // Meta Bilgiler
  tarih: string;
  timestamp: string;
  model: string;
}

export function buildReportPayload(
  analysis?: { kurum?: string; ihale_turu?: string; sure?: string; butce?: string; [key: string]: unknown; },
  cost?: { gunluk_kisi_maliyeti?: string; tahmini_toplam_gider?: string; onerilen_karlilik_orani?: string; riskli_kalemler?: string[]; maliyet_dagilimi?: { hammadde?: string; iscilik?: string; genel_giderler?: string; kar?: string; }; optimizasyon_onerileri?: string[]; },
  decision?: { karar?: "Katıl" | "Katılma" | "Dikkatli Katıl"; gerekce?: string; risk_orani?: string; tahmini_kar_orani?: string; stratejik_oneriler?: string[]; kritik_noktalar?: string[]; },
  menu?: Array<{ yemek: string; gramaj: number; ogun?: string; kisi?: number; kategori?: string; }>
): ReportPayload {
  const now = new Date();

  const toplam_gramaj = menu?.reduce((sum, item) => sum + item.gramaj, 0) || 0;
  const kisi_sayisi = menu?.[0]?.kisi || 0;

  return {
    kurum: analysis?.kurum || "—",
    ihale_turu: analysis?.ihale_turu || "—",
    sure: analysis?.sure || "—",
    butce: analysis?.butce || "—",
    gunluk_kisi_maliyeti: cost?.gunluk_kisi_maliyeti || "—",
    tahmini_toplam_gider: cost?.tahmini_toplam_gider || "—",
    onerilen_karlilik_orani: cost?.onerilen_karlilik_orani || "—",
    riskli_kalemler: cost?.riskli_kalemler || [],
    maliyet_dagilimi: {
      hammadde: cost?.maliyet_dagilimi?.hammadde || "—",
      iscilik: cost?.maliyet_dagilimi?.iscilik || "—",
      genel_giderler: cost?.maliyet_dagilimi?.genel_giderler || "—",
      kar: cost?.maliyet_dagilimi?.kar || "—",
    },
    karar: decision?.karar || "—",
    risk_orani: decision?.risk_orani || "—",
    tahmini_kar_orani: decision?.tahmini_kar_orani || "—",
    gerekce: decision?.gerekce || "—",
    stratejik_oneriler: decision?.stratejik_oneriler || [],
    kritik_noktalar: decision?.kritik_noktalar || [],
    menu_items: menu,
    toplam_gramaj: toplam_gramaj > 0 ? toplam_gramaj : undefined,
    kisi_sayisi: kisi_sayisi > 0 ? kisi_sayisi : undefined,
    tarih: now.toLocaleString("tr-TR"),
    timestamp: now.toISOString(),
    model: "claude-sonnet-4-20250514",
  };
}

export function generateReportFilename(type: "pdf" | "xlsx"): string {
  const timestamp = Date.now();
  const date = new Date().toISOString().split("T")[0];
  return `procheff-rapor-${date}-${timestamp}.${type}`;
}
```

**Verification**:
```bash
# Check that buildReportPayload still works
grep -A 5 "const reportData = buildReportPayload" src/app/api/export/pdf/route.ts
# Should still be there and working

npm run build
# Should succeed
```

---

## Action 4: Handle Unused Modules (P2 - MEDIUM)

### 4.1 Evaluate provider-factory-enhanced.ts

**File**: `/src/lib/ai/provider-factory-enhanced.ts`  
**Current Status**: Not imported anywhere

**Decision Tree**:

```
Is this planned for future use?
├─ YES → Add to documentation
│   ├─ Add file header comment: "EXPERIMENTAL - Procheff-v2 integration"
│   └─ Document in: docs/AI-STRATEGY.md
├─ NO → Delete
│   ├─ Command: rm src/lib/ai/provider-factory-enhanced.ts
│   └─ Verify: grep -r "provider-factory-enhanced" . --include="*.ts*"
```

**Recommended**: Document as experimental
```typescript
/**
 * ⚠️ EXPERIMENTAL: Enhanced AI Provider Factory
 * 
 * Procheff-v2 integration: Dynamic provider selection based on text length and budget.
 * Currently not used - system uses AIProviderFactory from provider-factory.ts
 * 
 * Status: Under evaluation for future multi-provider support
 * Last reviewed: 2025-11-12
 * 
 * When ready to integrate:
 * 1. Add tests for provider selection logic
 * 2. Implement fallback handling
 * 3. Update AIProviderFactory to use this logic
 * 4. Remove this file once migration complete
 */
```

### 4.2 Evaluate Store Files

**Files**: 
- `/src/store/usePipelineStore.ts` (Not imported)
- `/src/store/chatStore.ts` (Not imported)

**Recommendation**:

**Option A**: Document their purpose
```typescript
// In each file header, add:
/**
 * 📋 STORE STATUS
 * 
 * Status: [ACTIVE | LEGACY | EXPERIMENTAL]
 * Used by: [List files or "None - experimental"]
 * Purpose: [Clear description]
 * 
 * When this changed:
 * - v2.0: Created as tender pipeline state
 * - v3.0: Superseded by analysisStore for file-based analysis
 * - Future: May be used for tender exploration workflow
 */
```

**Option B**: Consolidate if truly redundant
- Merge `usePipelineStore` functionality into `analysisStore`
- Remove duplicate state management patterns
- Effort: Medium (1-2 hours refactoring)

**Option C**: Archive for future use
```bash
# Move to docs folder
mv src/store/usePipelineStore.ts docs/archived/usePipelineStore.ts.bak
```

**Recommendation**: Choose Option A (document) for now, refactor later if needed.

---

## Action 5: Clean Up Comments (OPTIONAL P3)

### 5.1 Update Misleading Comments

**File**: `/src/app/analysis/history/page.tsx`  
**Current Comment**:
```typescript
// Combine data from /api/auto/history, /api/batch/jobs, etc.
```

**Updated Comment**:
```typescript
// Combine data from /api/auto/history and other analysis endpoints
```

---

## Verification Checklist

After applying all fixes, verify with:

```bash
# 1. No TypeScript errors
npx tsc --noEmit
# Expected: ✅ No errors

# 2. Build succeeds
npm run build
# Expected: ✅ Successfully generated

# 3. Linting passes
npm run lint
# Expected: ✅ No errors

# 4. No references to deleted batch routes
grep -r "'/batch'" src/app --include="*.ts*"
grep -r '"/batch"' src/app --include="*.ts*"
# Expected: No results (or only in comments)

# 5. No duplicate imports
find src/lib/utils -name "smart-text-formatter*"
# Expected: Only smart-text-formatter.ts

# 6. Confirm active imports still work
grep -r "buildReportPayload\|generateReportFilename" src/app/api/export --include="*.ts"
# Expected: 2 results (pdf and xlsx routes)

# 7. No broken store imports
npm run build 2>&1 | grep -i "store\|import"
# Expected: No errors related to stores

# 8. Test in browser
# - Navigate to dashboard
# - Click "Quick Actions" - no 404 errors
# - Browse other pages - breadcrumb works
# - Export reports - still works
```

---

## Summary of Changes

### Files to Modify
- `/src/app/page.tsx` - Remove batch quick action (1 line)
- `/src/components/ui/Breadcrumb.tsx` - Remove batch entries (2 lines)
- `/src/lib/utils/report-builder.ts` - Remove unused functions/interfaces (~80 lines)
- `/src/app/analysis/history/page.tsx` - Update comment (1 line)

### Files to Delete
- `/src/lib/utils/smart-text-formatter.tsx` - Duplicate

### Files to Document
- `/src/lib/ai/provider-factory-enhanced.ts` - Add experimental warning
- `/src/store/usePipelineStore.ts` - Add status comment
- `/src/store/chatStore.ts` - Add status comment

### Net Impact
- **Lines removed**: ~85
- **Lines added**: ~5 (documentation)
- **Files deleted**: 1
- **Breaking changes**: 0 ✅

---

## Rollback Plan

If any changes cause issues:

```bash
# Restore from git
git checkout src/app/page.tsx
git checkout src/components/ui/Breadcrumb.tsx
git checkout src/lib/utils/report-builder.ts
git checkout src/lib/utils/smart-text-formatter.tsx

# Rebuild
npm run build
```

---

**Estimated Time**: 15-20 minutes total  
**Risk Level**: LOW (mostly deletions, no logic changes)  
**Testing Required**: Light (just verify UI doesn't break)

