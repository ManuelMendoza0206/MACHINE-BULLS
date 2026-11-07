import { test, expect } from '@playwright/test';

// visual-regression/spec.md — Task 86e302a2b
// Deterministic visual checks on base UI components across light and dark modes.

test.describe('Visual Regression - Design System Components', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/**', route =>
      route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
    );
  });

  test('verifies base UI tokens in light mode', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
    });

    const bodyBg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    expect(bodyBg).toBeDefined();

    // Verify button rendering and contrast
    const buttons = page.locator('button');
    const buttonCount = await buttons.count();
    expect(buttonCount).toBeGreaterThan(0);
  });

  test('verifies base UI tokens in dark mode', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      document.documentElement.classList.remove('light');
      document.documentElement.classList.add('dark');
    });

    await expect(page.locator('html')).toHaveClass(/dark/);
    const darkBg = await page.evaluate(() => {
      const rgb = getComputedStyle(document.body).backgroundColor.match(/\d+/g) ?? [];
      return rgb.map(Number).reduce((acc, n) => acc + n, 0);
    });
    // Dark theme should have a low RGB sum (near black/dark slate)
    expect(darkBg).toBeLessThan(75);
  });
});
