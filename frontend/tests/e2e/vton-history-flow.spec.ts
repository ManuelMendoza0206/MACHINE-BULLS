import { test, expect } from '@playwright/test';

// Task 86e302a1c: Flujo Crítico 4: Historial de Pruebas Virtuales VTON.

test.describe('Flujo Crítico 4: Historial VTON', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/v1/vton/jobs**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          jobs: [
            {
              id: 'job-h-1',
              status: 'completed',
              result_url: 'https://cdn.styleme.app/vton/job-h-1.webp',
              created_at: new Date().toISOString(),
              outfit_id: 'outfit-1',
            },
            {
              id: 'job-h-2',
              status: 'failed',
              error_message: 'Pose no detectada',
              created_at: new Date().toISOString(),
              outfit_id: 'outfit-2',
            },
          ],
        }),
      });
    });
  });

  test('navigates to /try-on/history, displays page heading and return link', async ({ page }) => {
    await page.goto('/try-on/history');

    await expect(page).toHaveURL(/\/try-on\/history/);
    await expect(page.getByRole('heading', { name: /Historial de pruebas/i })).toBeVisible();

    const backButton = page.getByRole('link', { name: /Volver al probador/i });
    await expect(backButton).toBeVisible();
    await backButton.click();
    await expect(page).toHaveURL(/\/try-on$/);
  });
});
