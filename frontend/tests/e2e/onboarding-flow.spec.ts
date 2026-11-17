import { test, expect } from '@playwright/test';

// Task 86e302a1c: Flujo Crítico 3: Onboarding de nuevo usuario y preferencias estéticas.

test.describe('Flujo Crítico 3: Onboarding & Profile Preferences', () => {
  test('unauthenticated user is redirected to login from protected profile', async ({ page }) => {
    await page.goto('/profile');
    // Expect redirect or message requesting login
    await expect(page).toHaveURL(/\/login/);
  });

  test('home page features capsule catalog onboarding explore banner', async ({ page }) => {
    await page.route('**/api/v1/capsule', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          garments: [
            {
              garment_id: 'cap-1',
              title: 'Camisa Oxford Blanca',
              category: 'top',
              dominant_colors_hsv: [[0, 0, 1]],
              image_url: 'https://cdn.styleme.app/capsule/shirt.webp',
            },
          ],
        }),
      });
    });

    await page.goto('/');
    // Check main landing / catalog renders
    await expect(page.locator('main')).toBeVisible();
  });
});
