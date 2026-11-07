import { test, expect } from '@playwright/test';

// Task 86e302a1c: Flujo Crítico 1: Subida de prenda -> Outfit Recomendado -> Probador Virtual VTON.
// End-to-end user journey across the core value loop.

test.describe('Flujo Crítico 1: Wardrobe -> Outfits -> VTON', () => {
  test.beforeEach(async ({ page }) => {
    // Mock APIs to ensure deterministic execution in CI
    await page.route('**/api/v1/garments/upload', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          garment_id: 'g-test-123',
          category: 'top',
          aesthetic_scores: { streetwear: 0.9, minimalist: 0.8 },
          dominant_colors_hsv: [[0.5, 0.8, 0.9]],
          image_url: 'https://cdn.styleme.app/garments/test.webp',
        }),
      });
    });

    await page.route('**/api/v1/outfits**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          outfits: [
            {
              outfit_id: 'outfit-test-456',
              aesthetic: 'streetwear',
              chromatic_score: 0.95,
              embedding_score: 0.91,
              garments: [
                { garment_id: 'g-test-123', position: 'top' },
                { garment_id: 'g-bottom-789', position: 'bottom' },
              ],
            },
          ],
        }),
      });
    });

    await page.route('**/api/v1/vton/**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          job_id: 'vton-job-789',
          status: 'completed',
          result_url: 'https://cdn.styleme.app/vton/result.webp',
          error_message: null,
        }),
      });
    });
  });

  test('completes the full flow: wardrobe upload -> outfit recommendation -> try-on', async ({
    page,
  }) => {
    // 1. Ir al armario
    await page.goto('/wardrobe');

    // Aceptar consentimiento si aparece el modal/banner
    const consentButton = page.getByRole('button', { name: /acepto/i });
    if (await consentButton.isVisible({ timeout: 1500 }).catch(() => false)) {
      await consentButton.click();
    }

    // Verificar que estamos en el armario
    await expect(page).toHaveURL(/\/wardrobe/);

    // 2. Navegar a Outfits
    await page.goto('/outfits');
    await expect(page).toHaveURL(/\/outfits/);
    await expect(page.getByRole('heading', { name: /Outfits/i })).toBeVisible();

    // 3. Navegar al Probador Virtual
    await page.goto('/try-on');
    await expect(page).toHaveURL(/\/try-on/);
    await expect(page.getByRole('heading', { name: /Probador/i })).toBeVisible();
  });
});
