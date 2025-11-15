# 🧪 Testing Guide - Procheff-v3

**Last Updated:** November 15, 2025
**Migration Status:** Phase 1 Complete (53% coverage)
**Test Coverage:** ~35% (Target: 60%+)

---

## 📋 Table of Contents

1. [Quick Start](#quick-start)
2. [Test Structure](#test-structure)
3. [Running Tests](#running-tests)
4. [Writing Tests](#writing-tests)
5. [Integration Tests](#integration-tests)
6. [Security Testing](#security-testing)
7. [Performance Testing](#performance-testing)
8. [CI/CD Integration](#cicd-integration)

---

## 🚀 Quick Start

### Prerequisites

```bash
# Install dependencies
npm install

# Ensure database is set up
npm run db:migrate

# Set environment variables
cp .env.example .env.test
```

### Run All Tests

```bash
# Run unit tests
npm test

# Run integration tests
npm run test:integration

# Run E2E tests
npm run test:e2e

# Run all tests with coverage
npm run test:coverage
```

---

## 🏗️ Test Structure

```
procheff-v3/
├── src/
│   ├── **/__tests__/           # Unit tests (co-located)
│   │   ├── *.test.ts
│   │   └── *.spec.ts
│   └── lib/
│       └── ai/__tests__/        # AI-specific tests
├── tests/
│   ├── integration/             # Integration tests
│   │   ├── critical-endpoints.test.ts
│   │   ├── auth-flow.test.ts
│   │   └── analysis-pipeline.test.ts
│   ├── e2e/                     # End-to-end tests
│   │   ├── api.spec.ts
│   │   ├── auth.spec.ts
│   │   └── homepage.spec.ts
│   └── fixtures/                # Test data
│       ├── tenders/
│       └── menus/
└── jest.config.js
```

---

## 🎯 Running Tests

### Unit Tests

Test individual functions and classes in isolation.

```bash
# Run all unit tests
npm test

# Run specific test file
npm test semantic-cache.test.ts

# Run tests in watch mode
npm test -- --watch

# Run tests with coverage
npm test -- --coverage
```

### Integration Tests

Test API endpoints and database interactions.

```bash
# Run integration tests
npm run test:integration

# Run specific integration test
npm run test:integration -- critical-endpoints

# Run with database mode
DB_MODE=postgres npm run test:integration
```

### E2E Tests (Playwright)

Test complete user flows in browser.

```bash
# Run E2E tests
npm run test:e2e

# Run in headed mode (see browser)
npm run test:e2e -- --headed

# Run specific browser
npm run test:e2e -- --project=chromium
```

---

## ✍️ Writing Tests

### Unit Test Example

```typescript
// src/lib/utils/__tests__/validate.test.ts
import { describe, test, expect } from '@jest/globals';
import { validateEmail, validatePhone } from '../validate';

describe('Validation Utilities', () => {
  describe('validateEmail', () => {
    test('should accept valid email addresses', () => {
      expect(validateEmail('user@example.com')).toBe(true);
      expect(validateEmail('test.user+tag@domain.co.uk')).toBe(true);
    });

    test('should reject invalid email addresses', () => {
      expect(validateEmail('invalid')).toBe(false);
      expect(validateEmail('@example.com')).toBe(false);
      expect(validateEmail('user@')).toBe(false);
    });

    test('should handle edge cases', () => {
      expect(validateEmail('')).toBe(false);
      expect(validateEmail(null as any)).toBe(false);
      expect(validateEmail(undefined as any)).toBe(false);
    });
  });
});
```

### Integration Test Example

```typescript
// tests/integration/auth-flow.test.ts
import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';

describe('Authentication Flow', () => {
  const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';

  test('User can sign up, login, and access protected routes', async () => {
    // 1. Sign up
    const signupResponse = await fetch(`${BASE_URL}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'Test123!@#',
        name: 'Test User'
      })
    });

    expect(signupResponse.status).toBe(201);

    // 2. Login
    const loginResponse = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'Test123!@#'
      })
    });

    const { token } = await loginResponse.json();
    expect(token).toBeDefined();

    // 3. Access protected route
    const protectedResponse = await fetch(`${BASE_URL}/api/user/profile`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    expect(protectedResponse.status).toBe(200);
  });
});
```

---

## 🔒 Security Testing

### SQL Injection Tests

```typescript
describe('SQL Injection Prevention', () => {
  test('should safely handle malicious SQL in trust score', async () => {
    const maliciousInput = "'; DROP TABLE users; --";

    const response = await fetch(`${BASE_URL}/api/market/trust-score`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        source: maliciousInput,
        days: 30
      })
    });

    // Should reject or safely handle
    expect([200, 400, 422]).toContain(response.status);

    // Verify database integrity
    const healthCheck = await fetch(`${BASE_URL}/api/health`);
    const health = await healthCheck.json();
    expect(health.checks.database).toBe(true);
  });

  test('should use parameterized queries for date ranges', async () => {
    const response = await fetch(`${BASE_URL}/api/market/series?months=12`);

    // Should not contain SQL error messages
    const text = await response.text();
    expect(text).not.toMatch(/syntax error/i);
    expect(text).not.toMatch(/pg_/);
  });
});
```

### XSS Prevention Tests

```typescript
test('should sanitize HTML in user input', async () => {
  const maliciousInput = '<script>alert("XSS")</script>';

  const response = await fetch(`${BASE_URL}/api/user/profile`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ name: maliciousInput })
  });

  const data = await response.json();

  // Should be escaped or rejected
  expect(data.name).not.toContain('<script>');
});
```

---

## ⚡ Performance Testing

### Response Time Tests

```typescript
describe('Performance Benchmarks', () => {
  test('Health endpoint should respond in < 200ms', async () => {
    const start = performance.now();
    await fetch(`${BASE_URL}/api/health`);
    const duration = performance.now() - start;

    expect(duration).toBeLessThan(200);
  });

  test('Metrics endpoint should respond in < 1000ms', async () => {
    const start = performance.now();
    await fetch(`${BASE_URL}/api/metrics`);
    const duration = performance.now() - start;

    expect(duration).toBeLessThan(1000);
  });
});
```

### Load Testing

```typescript
test('Should handle 100 concurrent requests', async () => {
  const requests = Array(100).fill(null).map(() =>
    fetch(`${BASE_URL}/api/health`)
  );

  const start = performance.now();
  const responses = await Promise.all(requests);
  const duration = performance.now() - start;

  // All requests should succeed
  responses.forEach(response => {
    expect(response.status).toBe(200);
  });

  // Should complete in reasonable time
  expect(duration).toBeLessThan(5000); // 5 seconds for 100 requests
});
```

---

## 🔄 CI/CD Integration

### GitHub Actions Example

```yaml
name: Test Suite

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Run unit tests
        run: npm test

      - name: Run integration tests
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test
          DB_MODE: postgres
        run: npm run test:integration

      - name: Upload coverage
        uses: codecov/codecov-action@v3
```

---

## 📊 Test Coverage Goals

### Current Coverage (Estimated)

| Category | Coverage | Goal |
|----------|----------|------|
| **Utils** | ~60% | 80% |
| **API Routes** | ~30% | 70% |
| **Database Layer** | ~40% | 80% |
| **AI Services** | ~50% | 60% |
| **Overall** | **~35%** | **60%** |

### Priority Areas

1. **Critical API Endpoints** (Must be 80%+)
   - /api/health
   - /api/auth/*
   - /api/analysis/*

2. **Database Operations** (Must be 80%+)
   - universal-client.ts
   - db-adapter.ts
   - All repository files

3. **Security-Critical Code** (Must be 90%+)
   - Authentication
   - Authorization
   - Input validation
   - SQL query builders

---

## 🛠️ Testing Best Practices

### ✅ DO:

- Write tests before fixing bugs
- Test edge cases and error conditions
- Use descriptive test names
- Keep tests independent
- Mock external dependencies
- Clean up test data

### ❌ DON'T:

- Test implementation details
- Write flaky tests
- Share state between tests
- Ignore failing tests
- Skip security tests
- Leave console.logs in tests

---

## 🐛 Debugging Tests

### Enable Verbose Output

```bash
npm test -- --verbose
```

### Debug Specific Test

```bash
node --inspect-brk node_modules/.bin/jest --runInBand semantic-cache.test.ts
```

### View Database State

```bash
# SQLite mode
npm run db:inspect

# PostgreSQL mode
DB_MODE=postgres npm run db:console
```

---

## 📚 Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Playwright Documentation](https://playwright.dev/)
- [Testing Library](https://testing-library.com/)
- [Security Testing Guide (OWASP)](https://owasp.org/www-project-web-security-testing-guide/)

---

**Questions?** Check `CODE_QUALITY_REPORT.md` or ask in #engineering-testing

**Last Updated:** 2025-11-15
