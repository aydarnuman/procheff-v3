# Feature Flags Documentation

**Complete guide to feature flags in Procheff-v3**

**Last Updated**: 2025-01-12

---

## Overview

Feature flags allow enabling/disabling features without code changes. All features are opt-in via environment variables.

**Location**: `src/features/config.ts`

---

## Available Feature Flags

### Rate Limiting

**Environment Variable**: `ENABLE_RATE_LIMITING`

**Default**: `false`

**Requires**: Redis (UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN)

**Impact**: 
- Protects API endpoints from abuse
- Per-endpoint rate limits
- X-RateLimit-* headers

**Configuration**:
```typescript
// src/features/config.ts
RATE_LIMIT_CONFIG = {
  GLOBAL: { requests: 100, window: "1 m" },
  ENDPOINTS: {
    "/api/ai/deep-analysis": { requests: 5, window: "1 m" },
    "/api/ai/cost-analysis": { requests: 10, window: "1 m" },
    // ...
  }
}
```

**Usage**:
```bash
# Enable
ENABLE_RATE_LIMITING=true

# Disable
ENABLE_RATE_LIMITING=false
```

### Caching

**Environment Variable**: `ENABLE_CACHING`

**Default**: `false`

**Requires**: Redis

**Impact**:
- Response caching for AI operations
- Stale-While-Revalidate (SWR) pattern
- Tag-based invalidation

**TTL Configuration**:
```typescript
CACHE_CONFIG = {
  TTL: {
    ANALYSIS_RESULT: 3600,  // 1 hour
    METRICS: 300,           // 5 minutes
    NOTIFICATIONS: 60,     // 1 minute
    USER_DATA: 1800        // 30 minutes
  }
}
```

**Usage**:
```bash
ENABLE_CACHING=true
```

### Batch Processing

**Environment Variable**: `ENABLE_BATCH`

**Default**: `false`

**Requires**: None (uses SQLite)

**Impact**:
- Multi-file upload support
- Concurrent processing (3 parallel)
- Persistent queue

**Usage**:
```bash
ENABLE_BATCH=true
```

---

## Application Feature Flags

### ENABLE_IHALE_ANALYSIS
- **Default**: `true`
- **Impact**: İhale analysis features

### ENABLE_SMART_ANALYZE
- **Default**: `true`
- **Impact**: Smart analysis features

### ENABLE_MENU_MANAGEMENT
- **Default**: `true`
- **Impact**: Menu management features

### ENABLE_COST_CALCULATOR
- **Default**: `true`
- **Impact**: Cost calculator

### ENABLE_OFFER_ENGINE
- **Default**: `true`
- **Impact**: Offer/decision engine

### ENABLE_ANALYTICS
- **Default**: `true`
- **Impact**: Analytics features

---

## Checking Feature Status

### Programmatically

```typescript
import { getFeatureStatus } from '@/features/config';

const status = getFeatureStatus();
console.log(status);
// {
//   rateLimiting: { enabled: true, configured: true },
//   caching: { enabled: true, configured: true }
// }
```

### Via API

```bash
GET /api/performance/config
```

Returns:
```json
{
  "success": true,
  "data": {
    "featureFlags": {
      "rateLimiting": { "enabled": true },
      "caching": { "enabled": true }
    }
  }
}
```

---

## Best Practices

### Development

- Keep features **disabled** by default
- Enable only what you need
- Test with flags **on and off**

### Production

- Enable **rate limiting** and **caching**
- Monitor feature usage
- Use flags for **gradual rollouts**

### Changing Flags

⚠️ **Important**: Feature flag changes require **server restart**

```bash
# 1. Update .env.local
ENABLE_RATE_LIMITING=true

# 2. Restart server
npm run dev
# or
pm2 restart procheff-v3
```

---

## Troubleshooting

### "Feature not working"
- Check environment variable is set
- Verify server was restarted
- Check Redis connection (if required)

### "Redis not configured"
- If feature requires Redis: Set UPSTASH_REDIS_REST_URL
- Or: Disable feature flag

---

**Last Updated**: 2025-01-12  
**Maintained By**: Procheff-v3 Development Team


