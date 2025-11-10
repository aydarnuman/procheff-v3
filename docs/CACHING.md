# Caching System

## Overview

The caching module accelerates expensive operations by storing results in Redis. Features intelligent cache invalidation, tag-based clearing, and Stale-While-Revalidate (SWR) pattern.

## Features

- **Tag-based invalidation** - Clear related caches together
- **TTL management** - Auto-expire old data
- **SWR pattern** - Return stale data while fetching fresh
- **Content-based keys** - Deduplicate identical requests
- **Graceful degradation** - Works without Redis
- **Type-safe** - Full TypeScript support

## Architecture

```
src/features/caching/
├── cache-manager.ts   # Core cache operations
├── keys.ts           # Key generation utilities
└── strategies.ts     # Pre-configured patterns
```

## Configuration

### Environment Variables

```bash
# Enable caching
ENABLE_CACHING=true

# Upstash Redis (same as rate limiting)
UPSTASH_REDIS_REST_URL="https://your-redis.upstash.io"
UPSTASH_REDIS_REST_TOKEN="your-redis-token"
```

### TTL Configuration

Configured in `src/features/config.ts`:

```typescript
export const CACHE_CONFIG = {
  TTL: {
    ANALYSIS_RESULT: 3600,  // 1 hour (expensive operation)
    METRICS: 300,           // 5 minutes (frequently changing)
    DEFAULT: 600,           // 10 minutes
  },
};
```

## Usage

### Basic Caching

```typescript
import { withCache } from "@/features/caching/cache-manager";

export async function GET(req: NextRequest) {
  const result = await withCache(
    "my-cache-key",
    async () => {
      // Expensive operation
      return await fetchDataFromDatabase();
    },
    { ttl: 600, tags: ["data"] }
  );

  return NextResponse.json(result);
}
```

### Content-Based Caching

Cache analysis results by file hash (deduplicate identical files):

```typescript
import { cacheAnalysisResult } from "@/features/caching/strategies";
import { generateContentHash } from "@/features/caching/keys";

const fileHash = generateContentHash(fileContent);

const analysis = await cacheAnalysisResult(fileHash, async () => {
  return await analyzeFile(fileContent);
});
```

### Metrics Caching

Cache time-windowed metrics:

```typescript
import { cacheMetrics } from "@/features/caching/strategies";

const metrics = await cacheMetrics("24h", async () => {
  return await calculateMetrics("24h");
});
```

### Tag-Based Invalidation

Clear all related caches:

```typescript
import { invalidateCacheByTag } from "@/features/caching/cache-manager";

// After creating new analysis
await invalidateCacheByTag("analysis");

// After updating metrics
await invalidateCacheByTag("metrics");
```

### Stale-While-Revalidate

Return cached data immediately, update in background:

```typescript
import { cacheWithSWR } from "@/features/caching/strategies";

const data = await cacheWithSWR(
  "dashboard-data",
  async () => await fetchDashboardData(),
  {
    ttl: 300,      // Cache for 5 minutes
    staleTime: 60  // Return stale if < 60s old, revalidate in background
  }
);
```

## Strategies

### Analysis Result Caching

**When**: File analysis completes
**TTL**: 1 hour (expensive operation)
**Key**: `analysis:{fileHash}`
**Tags**: `["analysis"]`

```typescript
const result = await cacheAnalysisResult(fileHash, async () => {
  return await analyzeWithAI(content);
});
```

### Metrics Caching

**When**: Dashboard loads
**TTL**: 5 minutes (frequently changing)
**Key**: `metrics:{timeWindow}`
**Tags**: `["metrics"]`

```typescript
const metrics = await cacheMetrics("7d", async () => {
  return await calculateWeeklyMetrics();
});
```

### SWR Pattern

**When**: User-facing data that updates frequently
**Behavior**: Return stale, update background

```typescript
const liveData = await cacheWithSWR(
  "live-data",
  fetchLiveData,
  { ttl: 300, staleTime: 60 }
);
```

## Cache Keys

### Key Formats

Generated in `src/features/caching/keys.ts`:

```typescript
// Analysis result
`procheff:analysis:{sha256Hash}`

// Metrics
`procheff:metrics:{timeWindow}`

// Custom
`procheff:custom:{yourKey}`
```

### Content Hashing

Generate deterministic hash from content:

```typescript
import { generateContentHash } from "@/features/caching/keys";

const hash = generateContentHash("file content");
// → "a3b5c7d9..."
```

## Invalidation

### By Tag

Clear all caches with specific tag:

```typescript
import { invalidateAnalysisCaches, invalidateMetricsCaches } from "@/features/caching/strategies";

// Clear all analysis results
await invalidateAnalysisCaches();

// Clear all metrics
await invalidateMetricsCaches();
```

### Manual

Clear specific key:

```typescript
import { getRedisClient } from "@/features/rate-limiting/redis-client";

const redis = getRedisClient();
await redis?.del("procheff:custom:mykey");
```

## Monitoring

### Cache Hit Rate

Add logging to track performance:

```typescript
// Already built-in
// [Cache] HIT: procheff:analysis:abc123
// [Cache] MISS: procheff:analysis:xyz789
```

### Redis Stats

Check Upstash Console for:
- Hit/miss ratio
- Memory usage
- Key count
- Expiration patterns

## Testing

### Test Cache Hit

```bash
# First request - cache miss
curl http://localhost:3000/api/analysis/test

# Second request - cache hit (should be faster)
curl http://localhost:3000/api/analysis/test
```

### Verify Expiration

```bash
# Wait for TTL to expire, then request again
sleep 61
curl http://localhost:3000/api/analysis/test
```

### Check Redis Keys

```bash
# List all keys
curl -X POST "$UPSTASH_REDIS_REST_URL/keys/procheff:*" \
  -H "Authorization: Bearer $UPSTASH_REDIS_REST_TOKEN"
```

## Best Practices

1. **Use tags** - Group related caches for easy invalidation
2. **Set appropriate TTLs** - Balance freshness vs performance
3. **Content-based keys** - Deduplicate identical operations
4. **Invalidate on write** - Clear caches when data changes
5. **Monitor hit rates** - Optimize cache strategy
6. **Use SWR for UX** - Balance freshness and speed

## Performance

### Cache Hit Savings

| Operation | Uncached | Cached | Savings |
|-----------|----------|--------|---------|
| AI Analysis | 5-10s | 50ms | 99% |
| Metrics Calc | 500ms | 10ms | 98% |
| Dashboard | 2s | 100ms | 95% |

### Redis Latency

Upstash REST API: ~50-100ms worldwide

## Troubleshooting

### Cache not working

1. Check feature flag:
   ```bash
   echo $ENABLE_CACHING  # Should be "true"
   ```

2. Verify Redis connection:
   ```bash
   curl -X POST "$UPSTASH_REDIS_REST_URL/ping" \
     -H "Authorization: Bearer $UPSTASH_REDIS_REST_TOKEN"
   ```

3. Check logs for cache HIT/MISS

### Always cache MISS

- Keys changing between requests → Use deterministic key generation
- TTL too short → Increase in config
- Manual invalidation → Check invalidation calls

### Stale data returned

- TTL too long → Reduce in config
- No invalidation on update → Add `invalidateCacheByTag` calls
- Wrong tags → Verify tag usage

## Cost

Same as Rate Limiting (uses same Redis):
- Free tier: 10,000 requests/day
- Each cache operation = 1 Redis request
- SET + GET = 2 requests per cache miss
- GET only = 1 request per cache hit

## Security

- Keys namespaced with `procheff:` prefix
- No sensitive data in keys (use content hash)
- Auto-expiration prevents stale data
- Redis credentials in environment variables only

## Migration

### Disable Caching

Set `ENABLE_CACHING=false` - no code changes needed.

### Change TTLs

Edit `src/features/config.ts`:

```typescript
export const CACHE_CONFIG = {
  TTL: {
    ANALYSIS_RESULT: 7200,  // Increase to 2 hours
    METRICS: 60,            // Reduce to 1 minute
  },
};
```

## Related

- [Rate Limiting](./RATE-LIMITING.md) - Uses same Redis
- [Batch Processing](./BATCH-PROCESSING.md) - Can cache batch results
- [Architecture](./ARCHITECTURE.md) - System design
