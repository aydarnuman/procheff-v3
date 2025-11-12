import { test, expect } from '@playwright/test';

test.describe('Homepage', () => {
  test('should load homepage successfully', async ({ page }) => {
    await page.goto('/');
    
    // Wait for page to be interactive
    await page.waitForLoadState('networkidle');
    
    // Check for main heading or title
    const title = await page.title();
    expect(title).toBeTruthy();
  });

  test('should display command palette on Cmd+K', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Press Cmd+K (or Ctrl+K)
    const modifier = process.platform === 'darwin' ? 'Meta' : 'Control';
    await page.keyboard.press(`${modifier}+KeyK`);
    
    // Check if command palette is visible
    // This assumes command palette has a specific data-testid or class
    const commandPalette = page.locator('[role="dialog"]').first();
    await expect(commandPalette).toBeVisible({ timeout: 2000 });
  });
});



