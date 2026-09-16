import { test, expect } from '@playwright/test';

// design-system/spec.md — Requirement "Theme switching without FOUC".

test('persisted dark theme is applied before first paint (no FOUC on reload)', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('theme', 'dark'));
  await page.reload();

  // next-themes' blocking script must have set the class before the body painted.
  await expect(page.locator('html')).toHaveClass(/dark/);

  const channels = await page.evaluate(() => {
    const rgb = getComputedStyle(document.body).backgroundColor.match(/\d+/g) ?? [];
    return rgb.map(Number);
  });
  const sum = channels.reduce((acc, n) => acc + n, 0);
  expect(sum).toBeLessThan(60); // dark background token (#0C0C0D-ish), nowhere near white
});

test('the toggle cycles the theme on click', async ({ page }) => {
  await page.goto('/');
  const toggle = page.getByRole('button', { name: /tema:/i });

  await toggle.click();
  await expect(page.locator('html')).toHaveClass(/light/);
  await toggle.click();
  await expect(page.locator('html')).toHaveClass(/dark/);
});
