import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test('should show sign-in page for unauthenticated users', async ({ page }) => {
    await page.goto('/');
    
    // Should redirect to sign-in
    await expect(page).toHaveURL(/\/signin/);
  });

  test('should display sign-in form', async ({ page }) => {
    await page.goto('/signin');
    
    // Check for email and password fields
    const emailInput = page.locator('input[type="email"]');
    const passwordInput = page.locator('input[type="password"]');
    
    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
  });

  test('should show validation error for invalid credentials', async ({ page }) => {
    await page.goto('/signin');
    
    // Fill in invalid credentials
    await page.fill('input[type="email"]', 'invalid@example.com');
    await page.fill('input[type="password"]', 'wrongpassword');
    
    // Submit form
    await page.click('button[type="submit"]');
    
    // Wait for error message
    await page.waitForTimeout(1000);
    
    // Should still be on signin page or show error
    const currentUrl = page.url();
    expect(currentUrl).toContain('signin');
  });

  test('should allow navigation to register', async ({ page }) => {
    await page.goto('/signin');
    
    // Look for register link
    const registerLink = page.locator('text=/sign up|register|create account/i').first();
    
    if (await registerLink.isVisible()) {
      await registerLink.click();
      await page.waitForLoadState('networkidle');
      
      // Should show registration form
      const emailInput = page.locator('input[type="email"]');
      await expect(emailInput).toBeVisible();
    }
  });
});

test.describe('Authenticated Routes Protection', () => {
  test('should protect /auto route', async ({ page }) => {
    await page.goto('/auto');
    
    // Should redirect to sign-in
    await expect(page).toHaveURL(/\/signin/);
  });

  test('should protect /cost-analysis route', async ({ page }) => {
    await page.goto('/cost-analysis');
    
    // Should redirect to sign-in
    await expect(page).toHaveURL(/\/signin/);
  });

  test('should protect /monitor route', async ({ page }) => {
    await page.goto('/monitor');
    
    // Should redirect to sign-in
    await expect(page).toHaveURL(/\/signin/);
  });
});



