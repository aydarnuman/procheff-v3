# Troubleshooting Guide

**Common issues and solutions for Procheff-v3**

**Last Updated**: 2025-01-12

---

## 📚 Table of Contents

- [Build Issues](#build-issues)
- [Runtime Errors](#runtime-errors)
- [API Errors](#api-errors)
- [Database Issues](#database-issues)
- [Performance Problems](#performance-problems)
- [Authentication Issues](#authentication-issues)

---

## Build Issues

### "Module not found: Can't resolve 'fs'"

**Problem**: Server-only module imported in client component.

**Solution**:
1. Check imports in client components (`'use client'`)
2. Move server-only code to API routes
3. Use dynamic imports for server modules

**Example Fix**:
```typescript
// ❌ Bad (in client component)
import { getDB } from '@/lib/db/sqlite-client';

// ✅ Good (in API route)
import { getDB } from '@/lib/db/sqlite-client';
```

### TypeScript Compilation Errors

**Problem**: Type errors during build.

**Solution**:
1. Run `npx tsc --noEmit` to see all errors
2. Fix type mismatches
3. Add type assertions if needed

### Webpack Errors

**Problem**: Webpack build fails.

**Solution**:
1. Clear `.next` folder: `rm -rf .next`
2. Clear node_modules: `rm -rf node_modules && npm install`
3. Rebuild: `npm run build`

---

## Runtime Errors

### "ANTHROPIC_API_KEY is missing"

**Problem**: API key not configured.

**Solution**:
1. Add to `.env.local`: `ANTHROPIC_API_KEY=sk-ant-...`
2. Restart dev server
3. Verify key format starts with `sk-ant-`

### "Cannot connect to Redis"

**Problem**: Redis connection failed.

**Solution**:
1. If not needed: Set `ENABLE_RATE_LIMITING=false`
2. If needed: Check `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`
3. Test connection: `curl $UPSTASH_REDIS_REST_URL/ping`

### "Database locked"

**Problem**: SQLite database is locked.

**Solution**:
1. Close other connections
2. Check file permissions
3. Restart server
4. If persistent: Delete and recreate database

---

## API Errors

### 429 Too Many Requests

**Problem**: Rate limit exceeded.

**Solution**:
1. Wait for rate limit reset
2. Check `X-RateLimit-Reset` header
3. Reduce request frequency
4. Increase rate limits in config (if admin)

### 500 Internal Server Error

**Problem**: Server error.

**Solution**:
1. Check server logs: `/api/logs`
2. Review error details in response
3. Check environment variables
4. Verify database connection

### SSE Stream Errors

**Problem**: Server-Sent Events not working.

**Solution**:
1. Check browser console for errors
2. Verify endpoint supports SSE
3. Check network connectivity
4. Review SSE parsing in client code

---

## Database Issues

### "Table does not exist"

**Problem**: Database schema not initialized.

**Solution**:
1. Run schema initialization
2. Check database file exists
3. Verify file permissions

### "SQLITE_BUSY"

**Problem**: Database is busy.

**Solution**:
1. Close other connections
2. Increase timeout
3. Use connection pooling

### Data Not Persisting

**Problem**: Data not saved to database.

**Solution**:
1. Check database path is correct
2. Verify write permissions
3. Check transaction commits
4. Review error logs

---

## Performance Problems

### Slow API Responses

**Problem**: API endpoints are slow.

**Solution**:
1. Enable caching: `ENABLE_CACHING=true`
2. Check Redis connection
3. Optimize database queries
4. Review AI API response times

### High Memory Usage

**Problem**: Application using too much memory.

**Solution**:
1. Check for memory leaks
2. Review cache size
3. Limit concurrent operations
4. Monitor with `/api/metrics`

### Build Takes Too Long

**Problem**: Build process is slow.

**Solution**:
1. Clear `.next` cache: `rm -rf .next`
2. Use `npm run build` (not dev)
3. Check for large dependencies
4. Consider incremental builds

---

## Authentication Issues

### "NEXTAUTH_SECRET is not set"

**Problem**: NextAuth secret missing.

**Solution**:
1. Generate secret: `openssl rand -base64 32`
2. Add to `.env.local`: `NEXTAUTH_SECRET=...`
3. Restart server

### Login Not Working

**Problem**: Cannot log in.

**Solution**:
1. Check `NEXTAUTH_URL` matches your domain
2. Verify database has users table
3. Check session cookies are set
4. Review NextAuth logs

### Session Expires Too Quickly

**Problem**: Sessions expire immediately.

**Solution**:
1. Check `NEXTAUTH_URL` is correct
2. Verify cookie settings
3. Check browser cookie settings
4. Review NextAuth configuration

---

## Component Errors

### "Component will crash"

**Problem**: Missing state or props.

**Solution**:
1. Check component props
2. Verify state initialization
3. Add default values
4. Review error stack trace

### "Cannot read property of undefined"

**Problem**: Accessing undefined property.

**Solution**:
1. Add null checks
2. Use optional chaining: `obj?.property`
3. Provide default values
4. Verify data structure

---

## File Upload Issues

### "File too large"

**Problem**: File exceeds size limit.

**Solution**:
1. Check `MAX_DOCUMENT_SIZE_MB` (default: 50MB)
2. Increase limit if needed
3. Compress files before upload
4. Check server body size limit

### Upload Fails

**Problem**: File upload not working.

**Solution**:
1. Check file format is supported
2. Verify API endpoint is correct
3. Check network connectivity
4. Review server logs

---

## AI Analysis Issues

### "AI API Error"

**Problem**: Claude/Gemini API error.

**Solution**:
1. Verify API keys are valid
2. Check API quota/limits
3. Review API response
4. Check network connectivity

### Analysis Takes Too Long

**Problem**: Analysis is slow.

**Solution**:
1. Enable caching: `ENABLE_CACHING=true`
2. Reduce document size
3. Check AI API response times
4. Use async processing

---

## Getting Help

### Check Logs

```bash
# Application logs
GET /api/logs

# Browser console
# Open DevTools → Console

# Server logs
# Check terminal output
```

### Debug Mode

```bash
# Enable debug logging
LOG_LEVEL=debug npm run dev
```

### Common Solutions

1. **Restart server**: `Ctrl+C` then `npm run dev`
2. **Clear cache**: `rm -rf .next`
3. **Reinstall dependencies**: `rm -rf node_modules && npm install`
4. **Check environment**: Verify all required variables are set

---

**Last Updated**: 2025-01-12  
**Maintained By**: Procheff-v3 Development Team


