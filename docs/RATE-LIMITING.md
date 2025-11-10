# Rate Limiting

## Overview

The rate limiting module protects API endpoints from abuse by limiting the number of requests a user can make within a time window. Built on [Upstash Redis](https://upstash.com) with sliding window algorithm.

## Features

- **Per-endpoint configuration** - Different limits for different endpoints
- **Per-user tracking** - Uses IP address or session ID
- **Sliding window algorithm** - Smooth rate limiting without burst issues
- **Graceful degradation** - Falls open if Redis is unavailable
- **Standard headers** - Returns `X-RateLimit-*` headers
- **429 responses** - Clear error messages with retry timing

## Architecture

```
src/features/rate-limiting/
├── redis-client.ts      # Singleton Redis connection
└── middleware.ts        # Rate limit checking logic
```

## Configuration

### Environment Variables

```bash
# Enable rate limiting
ENABLE_RATE_LIMITING=true

# Upstash Redis (required)
UPSTASH_REDIS_REST_URL="https://your-redis.upstash.io"
UPSTASH_REDIS_REST_TOKEN="your-redis-token"
```

Get free Redis at: https://upstash.com

### Default Limits

Configured in `src/features/config.ts`:

```typescript
export const RATE_LIMIT_CONFIG = {
  ENDPOINTS: {
    "/api/ai/deep-analysis": { requests: 5, window: "1 m" },
    "/api/cost-analysis": { requests: 10, window: "1 m" },
    "/api/batch/upload": { requests: 3, window: "1 h" },
  },
};
```

## Usage

### Protect an API Route

```typescript
import { checkRateLimit, addRateLimitHeaders } from "@/features/rate-limiting/middleware";

export async function POST(req: NextRequest) {
  // Check rate limit
  const limitResult = await checkRateLimit(req, "/api/your-endpoint");

  if (!limitResult.success) {
    return limitResult.response!; // Returns 429 with Retry-After
  }

  // Your logic here...
  const data = await processRequest();

  // Add rate limit headers to response
  const response = NextResponse.json({ success: true, data });
  return addRateLimitHeaders(response, limitResult);
}
```

### Response Headers

When rate limiting is active, responses include:

```
X-RateLimit-Limit: 5
X-RateLimit-Remaining: 3
X-RateLimit-Reset: 1735678901
```

### 429 Rate Limit Exceeded

```json
{
  "error": "Rate limit exceeded",
  "message": "Try again in 45 seconds."
}
```

Headers:
```
Retry-After: 45
X-RateLimit-Limit: 5
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1735678901
```

## How It Works

1. **Request comes in** → Extract user identifier (IP or session)
2. **Check Redis** → Count requests in sliding window
3. **Within limit?**
   - ✅ Yes → Allow request, update counter, add headers
   - ❌ No → Return 429 with retry timing
4. **Redis unavailable?** → Fail open (allow request)

## Adding New Endpoints

Edit `src/features/config.ts`:

```typescript
export const RATE_LIMIT_CONFIG = {
  ENDPOINTS: {
    // ... existing endpoints
    "/api/your-new-endpoint": {
      requests: 20,      // Allow 20 requests
      window: "1 m"      // Per minute
    },
  },
};
```

Supported windows: `"1 s"`, `"1 m"`, `"1 h"`, `"1 d"`

## Testing

### Test Rate Limit

```bash
# Hit endpoint 6 times rapidly (limit is 5)
for i in {1..6}; do
  curl -X POST http://localhost:3000/api/ai/deep-analysis \
    -H "Content-Type: application/json" \
    -d '{"content":"test"}'
  echo "\n---"
done
```

Expected: First 5 succeed, 6th returns 429.

### Check Headers

```bash
curl -i http://localhost:3000/api/ai/deep-analysis
```

Look for `X-RateLimit-*` headers.

## Monitoring

### Check Redis Health

```bash
curl http://localhost:3000/api/health
```

Should show Redis status.

### View Rate Limit Stats

Use Upstash Console to see:
- Active keys
- Request patterns
- Memory usage

## Troubleshooting

### Rate limiting not working

1. Check feature flag:
   ```bash
   echo $ENABLE_RATE_LIMITING  # Should be "true"
   ```

2. Verify Redis credentials:
   ```bash
   curl -X POST "$UPSTASH_REDIS_REST_URL/ping" \
     -H "Authorization: Bearer $UPSTASH_REDIS_REST_TOKEN"
   ```

3. Check logs for Redis connection errors

### All requests allowed

- Feature flag disabled → Set `ENABLE_RATE_LIMITING=true`
- Redis unavailable → Check credentials
- Endpoint not configured → Add to `RATE_LIMIT_CONFIG`

### 429 errors too aggressive

Increase limits in `src/features/config.ts`:

```typescript
"/api/your-endpoint": {
  requests: 100,  // Increase from 10
  window: "1 m"
}
```

## Best Practices

1. **Set appropriate limits** - Balance security and UX
2. **Add to all AI endpoints** - Protect expensive operations
3. **Monitor Redis usage** - Upstash has free tier limits
4. **Test before production** - Verify limits work as expected
5. **Document limits** - Add to API documentation

## Security

- Uses IP address by default (can be spoofed)
- For production: Use authenticated user ID
- Redis keys include endpoint + identifier
- Keys auto-expire after window closes

## Cost

Upstash pricing (2024):
- Free tier: 10,000 requests/day
- Pay-as-you-go: $0.20 per 100K requests
- Each rate limit check = 1 Redis request

## Related

- [Caching](./CACHING.md) - Uses same Redis instance
- [Batch Processing](./BATCH-PROCESSING.md) - Rate limited uploads
- [Architecture](./ARCHITECTURE.md) - System design
