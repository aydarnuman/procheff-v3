# 🚀 HIZLI FİX REFERANSI

## ❗ EN KRİTİK 3 KURAL

### 1. Database Query (EN ÖNEMLİ!)
```typescript
// ✅ DOĞRU
SELECT stage, result_data 
FROM analysis_results 
WHERE analysis_id = ?

// ❌ YANLIŞ
FROM analysis_results_v2  // Tablo yok!
WHERE id = ?               // Yanlış kolon!
```

### 2. Framer Motion Conditional
```tsx
// ✅ DOĞRU
<motion.button key={`btn-${state}`}>
  {condition ? <A /> : <B />}
</motion.button>

// ❌ YANLIŞ (crash!)
<motion.button>
  {condition ? <A /> : <B />}
</motion.button>
```

### 3. API Timeout
```typescript
// ✅ DOĞRU
await client.messages.create(
  { model, messages },
  { timeout: 30000 }  // İkinci argüman!
);

// ❌ YANLIŞ (10dk+ hang!)
await client.messages.create({
  model,
  messages,
  timeout: 30000  // Çalışmaz!
});
```

---

## 📦 DOSYALAR

- `src/lib/db/analysis-repository.ts` → Database
- `src/app/analysis/components/UltimateFileUploader.tsx` → React key
- `src/app/analysis/[id]/page.tsx` → Toast props
- `src/lib/tender-analysis/contextual.ts` → Timeout
- `src/store/analysisStore.ts` → Polling

---

## ⚡ TEST

```bash
# 1. Dosya yükle
# 2. "Derin AI Analizi Başlat"
# 3. Terminal'de izle:
#    ✅ Starting contextual analysis
#    ✅ Contextual analysis completed (20-30s)
#    ✅ Background analysis completed
# 4. UI otomatik güncellenir (polling)
```

---

**Detaylı bilgi:** `CRITICAL-FIXES-2025-11-12.md`

