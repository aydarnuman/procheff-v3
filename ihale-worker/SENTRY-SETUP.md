# 🐛 Sentry Error Tracking Setup

## Quick Start (5 minutes)

### 1. Sign Up
Visit https://sentry.io and create a free account

### 2. Create Project
- Select "Node.js" as platform
- Name: `ihale-worker`
- Copy your DSN (looks like: `https://xxx@xxx.ingest.sentry.io/xxx`)

### 3. Configure Environment
```bash
# Add to .env
SENTRY_DSN=your-dsn-here
NODE_ENV=production
```

### 4. Enable in server.ts

Uncomment these lines in `src/server.ts`:

```typescript
// After imports:
import { initSentry, mountSentry, mountSentryErrorHandler, isSentryEnabled } from './sentry';

// Before creating Express app:
initSentry(); // Initialize Sentry first

// After app.use(express.json()):
mountSentry(app); // Must be BEFORE routes

// After mountIhalebul(app):
mountSentryErrorHandler(app); // Must be AFTER routes

// In startup log:
if (isSentryEnabled()) {
  Log.bilgi('✅ Sentry error tracking aktif');
}
```

### 5. Restart Server
```bash
npm run dev
```

## Features

✅ **Automatic Error Tracking**
- Uncaught exceptions
- Unhandled promise rejections
- HTTP errors (4xx, 5xx)

✅ **Performance Monitoring**
- Request duration tracking
- Slow endpoint detection
- Memory usage trends

✅ **Breadcrumbs**
- Request logs
- Database queries
- External API calls

✅ **User Context**
- Session ID tracking
- IP address
- User agent

## Usage Examples

### Capture Exception
```typescript
import { captureException } from './sentry';

try {
  await riskyOperation();
} catch (error) {
  captureException(error, {
    sessionId: 'abc123',
    operation: 'fetch_tender'
  });
  throw error;
}
```

### Capture Message
```typescript
import { captureMessage } from './sentry';

captureMessage('Worker pool exhausted', 'warning');
```

### Add Breadcrumb
```typescript
import { addBreadcrumb } from './sentry';

addBreadcrumb('Fetching tender list', 'http', {
  sessionId: 'abc123',
  page: 1
});
```

## Dashboard

Access your Sentry dashboard:
- Issues: Real-time error tracking
- Performance: Slow endpoints
- Releases: Track deployments
- Alerts: Email/Slack notifications

## Free Tier Limits

- 5,000 errors/month
- 10,000 performance events/month
- 1 GB attachment storage
- Unlimited team members

**Perfect for production monitoring!** 🚀
