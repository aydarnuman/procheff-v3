# 🧪 Testing Guide

## Setup Jest

```bash
npm install --save-dev jest @types/jest ts-jest
```

### Configure Jest

Create `jest.config.js`:
```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/__tests__/**',
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
};
```

### Add Scripts

In `package.json`:
```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage"
  }
}
```

## Test Examples

### Browser Pool Tests

`src/__tests__/browser-pool.test.ts`:
```typescript
import { browserPool, createContext } from '../browser-pool';

describe('Browser Pool', () => {
  beforeAll(async () => {
    await browserPool.initialize();
  });

  afterAll(async () => {
    await browserPool.destroy();
  });

  it('should acquire and release browser', async () => {
    const { browser, context, release } = await createContext();

    expect(browser).toBeDefined();
    expect(context).toBeDefined();

    const stats = browserPool.getStats();
    expect(stats.inUse).toBe(1);

    await release();

    const statsAfter = browserPool.getStats();
    expect(statsAfter.inUse).toBe(0);
  });

  it('should respect max concurrent browsers', async () => {
    const browsers = [];

    for (let i = 0; i < 3; i++) {
      browsers.push(await createContext());
    }

    const stats = browserPool.getStats();
    expect(stats.total).toBeLessThanOrEqual(3);

    for (const b of browsers) {
      await b.release();
    }
  });

  it('should queue requests when pool exhausted', async () => {
    const browsers = [];

    // Acquire all browsers
    for (let i = 0; i < 3; i++) {
      browsers.push(await createContext());
    }

    // This should queue
    const promise = createContext();

    const stats = browserPool.getStats();
    expect(stats.waitingInQueue).toBeGreaterThan(0);

    // Release one
    await browsers[0].release();

    // Queued request should now complete
    const queued = await promise;
    expect(queued).toBeDefined();

    await queued.release();

    for (let i = 1; i < browsers.length; i++) {
      await browsers[i].release();
    }
  });
});
```

### Rate Limiter Tests

`src/__tests__/rate-limiter.test.ts`:
```typescript
import { rateLimiter, getRateLimiterStats } from '../middleware/rate-limiter';
import express from 'express';
import request from 'supertest';

describe('Rate Limiter', () => {
  let app: express.Express;

  beforeEach(() => {
    app = express();
    app.use(rateLimiter);
    app.get('/test', (req, res) => res.json({ ok: true }));
  });

  it('should allow requests within limit', async () => {
    for (let i = 0; i < 10; i++) {
      const res = await request(app).get('/test');
      expect(res.status).toBe(200);
    }
  });

  it('should block requests exceeding limit', async () => {
    // Make 21 requests (limit is 20)
    for (let i = 0; i < 21; i++) {
      const res = await request(app).get('/test');

      if (i < 20) {
        expect(res.status).toBe(200);
      } else {
        expect(res.status).toBe(429);
        expect(res.body.error).toBe('rate_limit_exceeded');
      }
    }
  });

  it('should reset after window expires', async () => {
    // Make 20 requests
    for (let i = 0; i < 20; i++) {
      await request(app).get('/test');
    }

    // Wait for window to expire (61 seconds)
    await new Promise(resolve => setTimeout(resolve, 61000));

    // Should be able to make requests again
    const res = await request(app).get('/test');
    expect(res.status).toBe(200);
  }, 70000); // Increase timeout for this test
});
```

### Config Tests

`src/__tests__/config.test.ts`:
```typescript
import { config } from '../config';

describe('Config', () => {
  it('should have valid defaults', () => {
    expect(config.PORT).toBeGreaterThan(0);
    expect(config.HOST).toBeDefined();
    expect(config.MAX_CONCURRENT_BROWSERS).toBeGreaterThan(0);
    expect(config.SESSION_TTL_MS).toBeGreaterThan(0);
  });

  it('should respect min browsers <= max browsers', () => {
    expect(config.MIN_BROWSERS_IN_POOL).toBeLessThanOrEqual(config.MAX_CONCURRENT_BROWSERS);
  });

  it('should have reasonable timeouts', () => {
    expect(config.BROWSER_TIMEOUT_MS).toBeGreaterThan(10000); // > 10s
    expect(config.BROWSER_TIMEOUT_MS).toBeLessThan(180000); // < 3min
  });

  it('should have rate limit configured', () => {
    expect(config.RATE_LIMIT_MAX_REQUESTS).toBeGreaterThan(0);
    expect(config.RATE_LIMIT_WINDOW_MS).toBeGreaterThan(0);
  });
});
```

## Run Tests

```bash
# Run all tests
npm test

# Watch mode (auto-run on file changes)
npm run test:watch

# Generate coverage report
npm run test:coverage

# Run specific test file
npm test -- browser-pool.test.ts
```

## Coverage Report

After running `npm run test:coverage`, open `coverage/lcov-report/index.html` in browser to see detailed coverage.

Target: **70%+ coverage** for all modules.

## CI Integration

Tests run automatically in GitHub Actions on every push/PR.

## Best Practices

✅ **Test isolation** - Each test should be independent
✅ **Mock external dependencies** - Don't call real ihalebul.com
✅ **Test edge cases** - Error handling, timeouts, limits
✅ **Fast tests** - Mock slow operations
✅ **Descriptive names** - "should X when Y"
✅ **Arrange-Act-Assert** - Clear test structure
