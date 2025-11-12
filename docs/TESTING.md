# Testing Strategy Documentation

**Complete testing guide for Procheff-v3**

**Last Updated**: 2025-01-12

---

## Overview

Procheff-v3 uses **Vitest** as the testing framework with TypeScript support.

**Test Framework**: Vitest 2.1.9  
**Coverage Provider**: @vitest/coverage-v8  
**Configuration**: `vitest.config.ts`

---

## Test Structure

```
tests/
├── setup.ts              # Test setup file
└── ...

src/
├── lib/
│   ├── ai/
│   │   └── __tests__/    # AI module tests
│   └── db/
│       └── __tests__/    # Database tests
```

---

## Running Tests

### Single Run

```bash
npm test
```

### Watch Mode

```bash
npm run test:watch
```

Automatically reruns tests when files change (TDD workflow).

### Coverage Report

```bash
npm run test:coverage
```

Generates coverage report in `coverage/` folder:
- **Text**: Console output
- **JSON**: `coverage/coverage-summary.json`
- **HTML**: `coverage/index.html` (open in browser)

---

## Test Configuration

### Vitest Config (`vitest.config.ts`)

```typescript
{
  test: {
    globals: true,              // Global test functions (describe, it, expect)
    environment: 'node',         // Node.js environment
    setupFiles: ['./tests/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'tests/',
        '**/*.config.ts'
      ]
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  }
}
```

### Path Aliases

Use `@/` prefix in tests:
```typescript
import { AILogger } from '@/lib/ai/logger';
```

---

## Writing Tests

### Basic Test

```typescript
import { describe, it, expect } from 'vitest';
import { TurkishNormalizer } from '@/lib/utils/turkish-normalizer';

describe('TurkishNormalizer', () => {
  it('should convert Turkish characters to ASCII', () => {
    const result = TurkishNormalizer.toAscii('İstanbul');
    expect(result).toBe('Istanbul');
  });
});
```

### Async Tests

```typescript
import { describe, it, expect } from 'vitest';
import { ZipExtractor } from '@/lib/utils/zip-extractor';

describe('ZipExtractor', () => {
  it('should extract files from ZIP', async () => {
    const file = new File([...], 'archive.zip');
    const result = await ZipExtractor.extract(file);
    expect(result.success).toBe(true);
    expect(result.files.length).toBeGreaterThan(0);
  });
});
```

### Mocking

```typescript
import { vi } from 'vitest';

// Mock fetch
global.fetch = vi.fn(() =>
  Promise.resolve({
    json: () => Promise.resolve({ success: true })
  })
);
```

---

## Test Categories

### Unit Tests

Test individual functions and utilities.

**Location**: `src/lib/**/__tests__/`

**Example**:
- `turkish-normalizer.test.ts`
- `zip-extractor.test.ts`
- `xlsx-processor.test.ts`

### Integration Tests

Test API endpoints and database operations.

**Location**: `src/app/api/**/__tests__/`

**Example**:
- `analysis-process.test.ts`
- `market-price.test.ts`

### E2E Tests

End-to-end tests for complete workflows.

**Location**: `tests/e2e/`

**Example**:
- `upload-to-analysis.test.ts`
- `pipeline-workflow.test.ts`

---

## Coverage Goals

### Current Coverage

- **Target**: 80%+
- **Critical Paths**: 90%+
- **Utilities**: 85%+

### Coverage Exclusions

- `node_modules/`
- `tests/`
- `**/*.config.ts`
- `dist/`

---

## Best Practices

### Test Organization

1. **One test file per source file**
2. **Group related tests** with `describe` blocks
3. **Use descriptive test names**
4. **Keep tests independent**

### Test Naming

```typescript
describe('ComponentName', () => {
  it('should do something when condition', () => {
    // ...
  });
});
```

### Assertions

Use Vitest's `expect` API:
```typescript
expect(value).toBe(expected);
expect(value).toEqual(expected);
expect(value).toContain(item);
expect(value).toBeTruthy();
expect(asyncFunction()).resolves.toBe(value);
```

### Cleanup

```typescript
afterEach(() => {
  // Clean up after each test
});

afterAll(() => {
  // Clean up after all tests
});
```

---

## Test Data

### Fixtures

Create test fixtures in `tests/fixtures/`:

```typescript
// tests/fixtures/sample-tender.json
{
  "id": "test_tender_1",
  "title": "Test Tender",
  ...
}
```

### Usage

```typescript
import tenderFixture from '../../tests/fixtures/sample-tender.json';

it('should process tender', () => {
  const result = processTender(tenderFixture);
  expect(result).toBeDefined();
});
```

---

## Continuous Integration

### GitHub Actions

```yaml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm install
      - run: npm test
      - run: npm run test:coverage
```

---

## Troubleshooting

### Tests not running
- Check `vitest.config.ts` is correct
- Verify test files match pattern `**/*.test.ts`
- Check `tests/setup.ts` exists

### Coverage not generating
- Install `@vitest/coverage-v8`
- Check coverage config in `vitest.config.ts`
- Run `npm run test:coverage`

### Import errors
- Verify path aliases in `vitest.config.ts`
- Check `tsconfig.json` paths match

---

**Last Updated**: 2025-01-12  
**Test Framework**: Vitest 2.1.9  
**Maintained By**: Procheff-v3 Development Team


