import { MarketFusion } from './schema';

/**
 * Piyasa fiyat cache yönetimi
 * Redis varsa Redis kullan, yoksa memory cache kullan
 */

const TTL_SECONDS = 60 * 60; // 1 saat cache

// Memory cache (fallback)
const memoryCache = new Map<string, { data: MarketFusion; expiry: number }>();

/**
 * Redis client (varsa)
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let redisClient: any = null;

// Redis'i başlat (Upstash) - dynamic import to avoid issues if package not installed
if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
  import('@upstash/redis').then(({ Redis }) => {
    redisClient = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });
  }).catch((error) => {
    console.warn('[Market Cache] Redis bağlantısı başarısız, memory cache kullanılacak:', error);
  });
}

/**
 * Cache'den veri oku
 */
export async function cacheGet(key: string): Promise<MarketFusion | null> {
  const cacheKey = `market:${key}`;

  try {
    // Redis varsa Redis'den oku
    if (redisClient) {
      const data = await redisClient.get(cacheKey);
      if (data) {
        return JSON.parse(data) as MarketFusion;
      }
      return null;
    }

    // Memory cache'den oku
    const cached = memoryCache.get(cacheKey);
    if (!cached) return null;

    // Expiry kontrolü
    if (Date.now() > cached.expiry) {
      memoryCache.delete(cacheKey);
      return null;
    }

    return cached.data;
  } catch (error) {
    console.error('[Market Cache] Okuma hatası:', error);
    return null;
  }
}

/**
 * Cache'e veri yaz
 */
export async function cacheSet(key: string, value: MarketFusion, ttl = TTL_SECONDS): Promise<void> {
  const cacheKey = `market:${key}`;

  try {
    // Redis varsa Redis'e yaz
    if (redisClient) {
      await redisClient.setex(cacheKey, ttl, JSON.stringify(value));
      return;
    }

    // Memory cache'e yaz
    const expiry = Date.now() + ttl * 1000;
    memoryCache.set(cacheKey, { data: value, expiry });
  } catch (error) {
    console.error('[Market Cache] Yazma hatası:', error);
  }
}

/**
 * Cache'i temizle
 */
export async function cacheClear(key: string): Promise<void> {
  const cacheKey = `market:${key}`;

  try {
    if (redisClient) {
      await redisClient.del(cacheKey);
      return;
    }

    memoryCache.delete(cacheKey);
  } catch (error) {
    console.error('[Market Cache] Silme hatası:', error);
  }
}

/**
 * Tüm cache'i temizle (pattern matching)
 */
export async function cacheClearAll(pattern = 'market:*'): Promise<number> {
  try {
    if (redisClient) {
      const keys = await redisClient.keys(pattern);
      if (keys.length > 0) {
        await Promise.all(keys.map((k: string) => redisClient.del(k)));
      }
      return keys.length;
    }

    // Memory cache'de pattern matching
    let count = 0;
    for (const key of memoryCache.keys()) {
      if (key.startsWith('market:')) {
        memoryCache.delete(key);
        count++;
      }
    }
    return count;
  } catch (error) {
    console.error('[Market Cache] Toplu silme hatası:', error);
    return 0;
  }
}

/**
 * Cache istatistikleri
 */
export async function cacheStats(): Promise<{
  type: 'redis' | 'memory';
  size: number;
  keys?: string[];
}> {
  try {
    if (redisClient) {
      const keys = await redisClient.keys('market:*');
      return {
        type: 'redis',
        size: keys.length,
        keys: keys.slice(0, 10), // İlk 10 key
      };
    }

    const keys = Array.from(memoryCache.keys());
    return {
      type: 'memory',
      size: keys.length,
      keys: keys.slice(0, 10),
    };
  } catch (error) {
    console.error('[Market Cache] İstatistik hatası:', error);
    return { type: 'memory', size: 0 };
  }
}

/**
 * Memory cache'i otomatik temizle (expired items)
 */
if (typeof window === 'undefined') {
  // Sadece server-side'da çalışsın
  setInterval(() => {
    const now = Date.now();
    for (const [key, value] of memoryCache.entries()) {
      if (now > value.expiry) {
        memoryCache.delete(key);
      }
    }
  }, 5 * 60 * 1000); // 5 dakikada bir temizle
}
