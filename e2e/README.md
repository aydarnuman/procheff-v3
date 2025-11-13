# E2E Tests with Playwright

End-to-end tests for Procheff-v3 using Playwright.

## Running Tests

### Prerequisites
```bash
# Install Playwright browsers (first time only)
npx playwright install
```

### Run Tests

```bash
# Run all E2E tests
npm run test:e2e

# Run tests in UI mode (interactive)
npm run test:e2e:ui

# Run tests in debug mode
npm run test:e2e:debug

# View last test report
npm run test:e2e:report
```

### Run Specific Tests

```bash
# Run specific test file
npx playwright test e2e/auth.spec.ts

# Run tests matching a pattern
npx playwright test --grep "authentication"

# Run tests in specific browser
npx playwright test --project=chromium
```

## Test Structure

- `auth.spec.ts` - Authentication flow tests
- `api.spec.ts` - API endpoint tests
- `homepage.spec.ts` - Homepage and navigation tests

## Writing Tests

### Basic Test Structure

```typescript
import { test, expect } from '@playwright/test';

test.describe('Feature Name', () => {
  test('should do something', async ({ page }) => {
    await page.goto('/');
    
    const element = page.locator('selector');
    await expect(element).toBeVisible();
  });
});
```

### API Testing

```typescript
test('should call API endpoint', async ({ request }) => {
  const response = await request.get('/api/endpoint');
  
  expect(response.ok()).toBeTruthy();
  const data = await response.json();
  expect(data).toHaveProperty('key');
});
```

## Configuration

See `playwright.config.ts` for configuration options:
- Test directory
- Browser configurations
- Timeouts and retries
- Screenshots and videos
- Base URL

## CI/CD Integration

Tests run automatically on CI with:
- Retries enabled (2 attempts)
- Single worker for stability
- GitHub Actions reporter
- Trace and video on failure

## Debugging

1. **UI Mode**: `npm run test:e2e:ui`
   - Interactive test explorer
   - Time travel debugging
   - Watch mode

2. **Debug Mode**: `npm run test:e2e:debug`
   - Playwright Inspector
   - Step through tests
   - Inspect locators

3. **Trace Viewer**: After test failure
   - `npx playwright show-trace trace.zip`
   - DOM snapshots
   - Network activity
   - Console logs

## Best Practices

1. **Use data-testid**: Add `data-testid` attributes for stable selectors
2. **Wait for states**: Use `waitForLoadState('networkidle')` 
3. **Avoid hardcoded waits**: Use `waitForSelector` instead of `waitForTimeout`
4. **Test isolation**: Each test should be independent
5. **Page object pattern**: Extract common page interactions

## Troubleshooting

### Tests timing out
- Increase timeout in config: `timeout: 60000`
- Check if dev server is running
- Verify network conditions

### Element not found
- Add explicit waits: `await page.waitForSelector('selector')`
- Check if element is in iframe
- Verify selector is correct

### Authentication issues
- Tests run in isolated context
- Set up auth state if needed
- Use `storageState` for session persistence






