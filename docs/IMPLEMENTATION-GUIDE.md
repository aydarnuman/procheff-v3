# 🚀 Implementation Guide - Yeni Utility'lerin Kullanımı

Bu dokümantasyon, yeni oluşturulan utility'lerin nasıl kullanılacağını gösterir.

---

## 1. Error Handling Middleware

### Kullanım

```typescript
// src/app/api/example/route.ts
import { errorHandler } from '@/lib/middleware/error-handler';
import { NextRequest, NextResponse } from 'next/server';

// ❌ Eski yöntem
export async function POST(req: NextRequest) {
  try {
    // Handler logic
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}

// ✅ Yeni yöntem
export const POST = errorHandler(async (req: NextRequest) => {
  // Handler logic - otomatik error handling
  return NextResponse.json({ success: true });
});
```

### Avantajlar
- ✅ Standart error response format
- ✅ Otomatik error categorization
- ✅ Correlation ID tracking
- ✅ Structured logging

---

## 2. StorageManager

### Kullanım

```typescript
// ❌ Eski yöntem
localStorage.setItem('analysis_123', JSON.stringify(data));
const data = JSON.parse(localStorage.getItem('analysis_123') || 'null');

// ✅ Yeni yöntem
import { StorageManager, storage } from '@/lib/storage/storage-manager';

// Generic usage
StorageManager.set('analysis_123', data, 24 * 60 * 60 * 1000); // 24 hours TTL
const data = StorageManager.get('analysis_123');

// Convenience functions
storage.setAnalysis('123', analysisData);
const analysis = storage.getAnalysis('123');

storage.setFiles('key', files);
const files = storage.getFiles('key');

storage.setSetting('theme', 'dark');
const theme = storage.getSetting('theme');
```

### Avantajlar
- ✅ TTL (Time To Live) desteği
- ✅ Otomatik cleanup
- ✅ Quota management
- ✅ Type-safe getters

---

## 3. DataPoolManager

### Kullanım

```typescript
// ❌ Eski yöntem
const db = getDB();
const row = db.prepare('SELECT data_pool FROM analysis_history WHERE id = ?').get(id);
const dataPool = JSON.parse(row.data_pool);

// ✅ Yeni yöntem
import { DataPoolManager } from '@/lib/state/data-pool-manager';

// Get DataPool (checks cache first, then DB)
const dataPool = await DataPoolManager.get(analysisId);

// Save DataPool (saves to DB and cache)
await DataPoolManager.save(analysisId, dataPool);

// Update DataPool (partial update)
await DataPoolManager.update(analysisId, {
  metadata: { ...existing.metadata, newField: 'value' }
});

// Check if exists
const exists = await DataPoolManager.exists(analysisId);

// Delete DataPool
await DataPoolManager.delete(analysisId);
```

### Event Listening

```typescript
import { DataPoolEventEmitter } from '@/lib/state/data-pool-manager';

// Subscribe to updates
const unsubscribe = DataPoolEventEmitter.on(analysisId, (dataPool) => {
  console.log('DataPool updated:', dataPool);
  // Update UI
});

// Later, unsubscribe
unsubscribe();
```

### Avantajlar
- ✅ Single source of truth
- ✅ Memory cache + DB persistence
- ✅ Event-driven updates
- ✅ Automatic cache management

---

## 4. SSE Stream Utility

### Kullanım

```typescript
// ❌ Eski yöntem
const stream = new ReadableStream({
  async start(controller) {
    const encoder = new TextEncoder();
    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'progress', progress: 50 })}\n\n`));
  }
});

// ✅ Yeni yöntem
import { createSSEResponse, SSEStream } from '@/lib/utils/sse-stream';

export async function POST(req: NextRequest) {
  return createSSEResponse(async (stream: SSEStream) => {
    stream.sendProgress('extracting', 10, 'Dosyalar yükleniyor...');
    
    // Do work
    await processFiles();
    
    stream.sendProgress('processing', 50, 'İşleniyor...');
    
    // More work
    const result = await analyze();
    
    stream.sendSuccess(result, 'İşlem tamamlandı');
  });
}
```

### Avantajlar
- ✅ Standart event format
- ✅ Type-safe events
- ✅ Otomatik error handling
- ✅ Progress clamping (0-100)

---

## 5. Request Manager

### Kullanım

```typescript
// ❌ Eski yöntem
const response = await fetch('/api/analysis/process');
const data = await response.json();

// ✅ Yeni yöntem
import { RequestManager, managedFetch } from '@/lib/api/request-manager';

// With deduplication and cancellation
const data = await RequestManager.request(
  `analysis:${analysisId}`,
  async (signal) => {
    const response = await fetch('/api/analysis/process', { signal });
    return response.json();
  },
  {
    cache: true, // Cache response for 5 minutes
    cacheTTL: 5 * 60 * 1000,
    cancelPrevious: true // Cancel previous request if new one comes
  }
);

// Or use convenience function
const data = await managedFetch(
  `analysis:${analysisId}`,
  '/api/analysis/process',
  {
    cache: true,
    cancelPrevious: true
  }
);

// Cancel a request
RequestManager.cancel(`analysis:${analysisId}`);

// Cancel all requests
RequestManager.cancelAll();
```

### Avantajlar
- ✅ Request deduplication
- ✅ Automatic cancellation
- ✅ Response caching
- ✅ AbortController integration

---

## Örnek: Güncellenmiş API Route

```typescript
// src/app/api/analysis/process-single/route.ts
import { errorHandler } from '@/lib/middleware/error-handler';
import { createSSEResponse, SSEStream } from '@/lib/utils/sse-stream';
import { DataPoolManager } from '@/lib/state/data-pool-manager';
import { NextRequest } from 'next/server';

export const POST = errorHandler(async (req: NextRequest) => {
  const sessionId = `process-single_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  // Check if SSE requested
  const wantsStreaming = req.headers.get('accept')?.includes('text/event-stream') ||
                        req.headers.get('x-want-streaming') === 'true';
  
  if (wantsStreaming) {
    return createSSEResponse(async (stream: SSEStream) => {
      try {
        const formData = await req.formData();
        const file = formData.get('file') as File;
        
        if (!file) {
          stream.sendError('NO_FILES', 'Dosya bulunamadı');
          return;
        }
        
        stream.sendProgress('validating', 10, 'Dosya doğrulanıyor...');
        
        // Process file
        const dataPool = await buildDataPool([file], options, (msg, progress) => {
          stream.sendProgress('processing', 10 + progress * 0.8, msg);
        });
        
        // Save to DataPoolManager
        const analysisId = generateId();
        await DataPoolManager.save(analysisId, dataPool);
        
        stream.sendSuccess({ analysisId, dataPool }, 'İşlem tamamlandı');
      } catch (error) {
        stream.sendError(
          'PROCESSING_ERROR',
          error instanceof Error ? error.message : 'Bilinmeyen hata'
        );
      }
    });
  }
  
  // Non-streaming response
  // ... normal JSON response
});
```

---

## Migration Checklist

### Phase 1: Error Handling
- [ ] Update all API routes to use `errorHandler`
- [ ] Remove manual try-catch blocks
- [ ] Test error responses

### Phase 2: Storage
- [ ] Replace `localStorage` calls with `StorageManager`
- [ ] Update component code
- [ ] Test TTL and cleanup

### Phase 3: DataPool
- [ ] Replace direct DB queries with `DataPoolManager`
- [ ] Update cache usage
- [ ] Test event listeners

### Phase 4: SSE
- [ ] Update SSE endpoints to use `SSEStream`
- [ ] Standardize event format
- [ ] Test streaming

### Phase 5: Requests
- [ ] Update fetch calls to use `RequestManager`
- [ ] Add caching where appropriate
- [ ] Test cancellation

---

## Best Practices

1. **Always use errorHandler** for API routes
2. **Use StorageManager** instead of direct localStorage
3. **Use DataPoolManager** for all DataPool operations
4. **Use SSEStream** for all SSE responses
5. **Use RequestManager** for fetch calls with deduplication needs

---

*Bu guide, yeni utility'lerin kullanımını gösterir. Tüm utility'ler production-ready ve type-safe'dir.*

