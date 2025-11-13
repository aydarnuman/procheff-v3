# Redis Cluster Setup & Integration

**Version**: 1.0  
**Date**: 2025-11-12  
**Purpose**: Distributed caching, session management, and rate limiting at scale

## Why Redis?

### Current Limitations

**SQLite for Caching**:
- Single-server only
- No distributed access
- Slower for high-frequency reads
- No pub/sub capabilities

**Problem**:
- Can't scale horizontally
- Cache not shared across servers
- Session management limited
- Rate limiting not distributed

### Redis Benefits

**Performance**:
- In-memory: ~100x faster than disk
- Sub-millisecond latency
- 100k+ ops/sec per instance

**Scalability**:
- Distributed across servers
- Cluster mode for sharding
- Replication for high availability

**Features**:
- Pub/Sub messaging
- Sorted sets for leaderboards
- TTL for automatic expiration
- Atomic operations

## Architecture Overview

```
┌──────────────┐
│  Next.js App │ (Multiple Instances)
└───────┬──────┘
        │
        ├─────────┬─────────┬─────────┐
        ▼         ▼         ▼         ▼
    ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐
    │Redis │  │Redis │  │Redis │  │Redis │
    │Node 1│  │Node 2│  │Node 3│  │Sentinel│
    └──────┘  └──────┘  └──────┘  └──────┘
        │         │         │
        └─────────┴─────────┘
         (Master-Replica Setup)
```

## Provider Options

### 1. Upstash Redis (Recommended)

**Pros**:
- Serverless (no management)
- Global edge network
- REST API (works in serverless)
- Generous free tier

**Pricing**:
- Free: 10k commands/day
- Pro: $10/mo - 100k commands/day
- Pro+: $50/mo - 1M commands/day

**Best For**: Vercel deployments, serverless

### 2. Redis Cloud

**Pros**:
- Managed service
- High availability
- Good performance

**Pricing**:
- Free: 30MB
- Paid: $7/mo - 250MB
- Enterprise: Custom pricing

**Best For**: Traditional deployments

### 3. DigitalOcean Managed Redis

**Pros**:
- Simple pricing
- Good integration with DO
- Automatic failover

**Pricing**:
- Starting: $15/mo - 1GB RAM
- Standard: $60/mo - 4GB RAM

**Best For**: DigitalOcean deployments

### 4. AWS ElastiCache

**Pros**:
- Enterprise features
- VPC integration
- Fine-grained control

**Pricing**:
- cache.t3.micro: $12/mo
- cache.t3.small: $25/mo

**Best For**: AWS infrastructure

**Recommendation**: **Upstash** for ease + Vercel compatibility

## Implementation with Upstash

### Step 1: Setup

**Create Account & Database**:
1. Sign up at https://upstash.com
2. Create Redis database
3. Copy REST URL and token

**Environment Variables**:
```bash
# .env.local
UPSTASH_REDIS_REST_URL="https://your-redis.upstash.io"
UPSTASH_REDIS_REST_TOKEN="your-token"

# Optional: Traditional Redis URL
REDIS_URL="redis://default:password@host:6379"
```

**Install Client**:
```bash
npm install @upstash/redis ioredis
```

### Step 2: Redis Client

**Unified Client** (`src/lib/cache/redis-client.ts`):

```typescript
import { Redis } from '@upstash/redis';
import IORedis from 'ioredis';

interface RedisClient {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ex?: number): Promise<void>;
  del(key: string): Promise<void>;
  exists(key: string): Promise<number>;
  expire(key: string, seconds: number): Promise<void>;
  incr(key: string): Promise<number>;
  zadd(key: string, score: number, member: string): Promise<void>;
  zrange(key: string, start: number, stop: number): Promise<string[]>;
}

class UnifiedRedisClient implements RedisClient {
  private client: Redis | IORedis;
  private type: 'upstash' | 'ioredis';
  
  constructor() {
    if (process.env.UPSTASH_REDIS_REST_URL) {
      // Upstash (serverless-friendly)
      this.client = new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN!,
      });
      this.type = 'upstash';
    } else if (process.env.REDIS_URL) {
      // Traditional Redis
      this.client = new IORedis(process.env.REDIS_URL);
      this.type = 'ioredis';
    } else {
      throw new Error('Redis configuration missing');
    }
  }
  
  async get(key: string): Promise<string | null> {
    const value = await this.client.get(key);
    return value as string | null;
  }
  
  async set(key: string, value: string, ex?: number): Promise<void> {
    if (ex) {
      await this.client.set(key, value, 'EX', ex);
    } else {
      await this.client.set(key, value);
    }
  }
  
  async del(key: string): Promise<void> {
    await this.client.del(key);
  }
  
  async exists(key: string): Promise<number> {
    return await this.client.exists(key);
  }
  
  async expire(key: string, seconds: number): Promise<void> {
    await this.client.expire(key, seconds);
  }
  
  async incr(key: string): Promise<number> {
    return await this.client.incr(key);
  }
  
  async zadd(key: string, score: number, member: string): Promise<void> {
    await this.client.zadd(key, score, member);
  }
  
  async zrange(key: string, start: number, stop: number): Promise<string[]> {
    const result = await this.client.zrange(key, start, stop);
    return result as string[];
  }
  
  /**
   * Graceful disconnect
   */
  async disconnect(): Promise<void> {
    if (this.type === 'ioredis') {
      await (this.client as IORedis).quit();
    }
  }
}

// Singleton instance
let redisClient: UnifiedRedisClient | null = null;

export function getRedisClient(): UnifiedRedisClient {
  if (!redisClient) {
    redisClient = new UnifiedRedisClient();
  }
  return redisClient;
}
```

### Step 3: Cache Manager with Redis

**Enhanced Cache Manager** (`src/lib/cache/cache-manager.ts`):

```typescript
import { getRedisClient } from './redis-client';
import { AILogger } from '@/lib/ai/logger';

export class CacheManager {
  private redis = getRedisClient();
  
  /**
   * Get cached value with JSON parsing
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.redis.get(key);
      if (!value) return null;
      
      return JSON.parse(value) as T;
    } catch (error) {
      AILogger.error('Cache get failed', { key, error });
      return null;
    }
  }
  
  /**
   * Set cached value with JSON serialization
   */
  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    try {
      const serialized = JSON.stringify(value);
      await this.redis.set(key, serialized, ttlSeconds);
      
      AILogger.info('Cache set', { key, ttl: ttlSeconds });
    } catch (error) {
      AILogger.error('Cache set failed', { key, error });
    }
  }
  
  /**
   * Delete cached value
   */
  async del(key: string): Promise<void> {
    await this.redis.del(key);
  }
  
  /**
   * Cache with automatic refresh (SWR pattern)
   */
  async getOrFetch<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl = 3600
  ): Promise<T> {
    // Try cache first
    const cached = await this.get<T>(key);
    if (cached) {
      return cached;
    }
    
    // Cache miss - fetch fresh data
    const fresh = await fetcher();
    
    // Cache for next time
    await this.set(key, fresh, ttl);
    
    return fresh;
  }
  
  /**
   * Increment counter (atomic)
   */
  async incr(key: string): Promise<number> {
    return await this.redis.incr(key);
  }
  
  /**
   * Add to sorted set (for leaderboards, rate limiting)
   */
  async zAdd(key: string, score: number, member: string): Promise<void> {
    await this.redis.zadd(key, score, member);
  }
  
  /**
   * Get range from sorted set
   */
  async zRange(key: string, start: number, stop: number): Promise<string[]> {
    return await this.redis.zrange(key, start, stop);
  }
}

export const cacheManager = new CacheManager();
```

### Step 4: Use Cases

#### A. API Response Caching

```typescript
// src/app/api/tenders/route.ts
import { cacheManager } from '@/lib/cache/cache-manager';

export async function GET() {
  const cacheKey = 'tenders:all';
  
  const tenders = await cacheManager.getOrFetch(
    cacheKey,
    async () => {
      // Expensive database query
      return await db.getAllTenders();
    },
    300 // 5 minutes TTL
  );
  
  return NextResponse.json({ tenders });
}
```

#### B. Session Storage

```typescript
// src/lib/auth/session.ts
import { cacheManager } from '@/lib/cache/cache-manager';

export async function saveSession(sessionId: string, data: SessionData) {
  await cacheManager.set(`session:${sessionId}`, data, 86400); // 24h
}

export async function getSession(sessionId: string) {
  return await cacheManager.get<SessionData>(`session:${sessionId}`);
}
```

#### C. Rate Limiting (Distributed)

```typescript
// src/lib/rate-limit/redis-rate-limiter.ts
import { cacheManager } from '@/lib/cache/cache-manager';

export async function checkRateLimit(
  identifier: string,
  limit: number,
  windowSeconds: number
): Promise<boolean> {
  const key = `rate:${identifier}`;
  const now = Date.now();
  const windowStart = now - (windowSeconds * 1000);
  
  // Add current request
  await cacheManager.zAdd(key, now, `${now}`);
  
  // Remove old entries
  const client = getRedisClient();
  await client.zremrangebyscore(key, '-inf', windowStart);
  
  // Count requests in window
  const count = await client.zcard(key);
  
  // Set expiration
  await client.expire(key, windowSeconds);
  
  return count <= limit;
}
```

#### D. Pub/Sub (Real-time Updates)

```typescript
// Publisher
import { getRedisClient } from '@/lib/cache/redis-client';

export async function notifyUpdate(channel: string, message: any) {
  const redis = getRedisClient();
  await redis.publish(channel, JSON.stringify(message));
}

// Subscriber
export async function subscribeToUpdates(
  channel: string, 
  handler: (message: any) => void
) {
  const redis = new IORedis(process.env.REDIS_URL);
  
  redis.subscribe(channel, (err) => {
    if (err) {
      console.error('Subscribe error:', err);
    }
  });
  
  redis.on('message', (ch, msg) => {
    if (ch === channel) {
      handler(JSON.parse(msg));
    }
  });
}
```

### Step 5: Semantic Cache Migration

**Move to Redis** (update `src/lib/ai/semantic-cache.ts`):

```typescript
import { cacheManager } from '@/lib/cache/cache-manager';

export async function getCachedResponse<T>(
  prompt: string,
  model: string,
  temperature: number
): Promise<{ data: T; metadata: CacheMetadata } | null> {
  const cacheKey = generateCacheKey(prompt, model, temperature);
  
  // Try Redis first
  const cached = await cacheManager.get<{ data: T; metadata: CacheMetadata }>(
    `semantic:${cacheKey}`
  );
  
  if (cached) {
    // Update hit count
    await cacheManager.incr(`semantic:hits:${cacheKey}`);
    return cached;
  }
  
  return null;
}

export async function setCachedResponse<T>(
  prompt: string,
  model: string,
  temperature: number,
  responseData: T,
  tokensUsed: number,
  ttlHours = 24
): Promise<void> {
  const cacheKey = generateCacheKey(prompt, model, temperature);
  
  await cacheManager.set(
    `semantic:${cacheKey}`,
    {
      data: responseData,
      metadata: {
        tokens_used: tokensUsed,
        cached_at: new Date().toISOString(),
      }
    },
    ttlHours * 3600
  );
}
```

## Monitoring

### Health Check

```typescript
// src/app/api/redis/health/route.ts
export async function GET() {
  try {
    const redis = getRedisClient();
    await redis.set('health:check', 'ok', 10);
    const value = await redis.get('health:check');
    
    return NextResponse.json({
      status: value === 'ok' ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json({
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown',
    }, { status: 500 });
  }
}
```

### Metrics

```typescript
export async function getCacheMetrics() {
  const redis = getRedisClient();
  
  // Get all cache keys
  const keys = await redis.keys('semantic:*');
  
  // Calculate hit rate
  const hits = await redis.get('cache:hits') || '0';
  const misses = await redis.get('cache:misses') || '0';
  const hitRate = parseInt(hits) / (parseInt(hits) + parseInt(misses));
  
  return {
    totalKeys: keys.length,
    hitRate: hitRate * 100,
    hits: parseInt(hits),
    misses: parseInt(misses),
  };
}
```

## Cost Optimization

### Strategies

1. **Shorter TTLs for Volatile Data**
   - Session data: 1-24 hours
   - API responses: 5-60 minutes
   - Static content: 7 days

2. **LRU Eviction**
   - Redis automatically evicts least-recently-used
   - Configure: `maxmemory-policy allkeys-lru`

3. **Compression**
   ```typescript
   import zlib from 'zlib';
   
   async function setCompressed(key: string, value: any) {
     const json = JSON.stringify(value);
     const compressed = zlib.gzipSync(json);
     await redis.set(key, compressed.toString('base64'));
   }
   ```

4. **Batch Operations**
   ```typescript
   // Use pipeline for multiple operations
   const pipeline = redis.pipeline();
   pipeline.set('key1', 'value1');
   pipeline.set('key2', 'value2');
   pipeline.set('key3', 'value3');
   await pipeline.exec();
   ```

## Migration Plan

### Phase 1: Parallel Run (Week 1)
- Keep SQLite cache
- Add Redis alongside
- Compare performance

### Phase 2: Gradual Shift (Week 2)
- 50% reads from Redis
- 100% writes to both
- Monitor consistency

### Phase 3: Full Cutover (Week 3)
- 100% reads from Redis
- Remove SQLite cache code
- Verify performance gains

## Rollback Strategy

**Feature Flag**:
```typescript
const USE_REDIS = process.env.ENABLE_REDIS_CACHE === 'true';

async function getCache(key: string) {
  if (USE_REDIS) {
    return await redisCache.get(key);
  } else {
    return await sqliteCache.get(key);
  }
}
```

**Emergency Rollback**:
```bash
# Disable Redis
export ENABLE_REDIS_CACHE=false

# Restart
pm2 restart procheff-v3
```

## Performance Benchmarks

**Expected Improvements**:
- Cache read: 50ms → 2ms (25x faster)
- Rate limiting: 10ms → 1ms (10x faster)
- Session lookup: 30ms → 3ms (10x faster)

## Next Steps

**Immediate**:
1. ✅ Sign up for Upstash
2. ⏳ Create Redis database
3. ⏳ Install dependencies
4. ⏳ Implement unified client

**Short-term**:
1. Migrate semantic cache
2. Implement session storage
3. Add distributed rate limiting
4. Performance testing

**Long-term**:
1. Pub/Sub for real-time features
2. Leaderboards/analytics
3. Job queue (Bull/BullMQ)
4. Full SQLite cache removal

---

**Last Updated**: 2025-11-12  
**Status**: Ready for Implementation  
**Estimated Cost**: $0-10/month (Upstash free tier likely sufficient)






