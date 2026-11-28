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
              job_id: '5d8f1e2a-1234-4567-8901-abcdef123456',
              status: 'completed',
              stage: 'completed',
              result_url: 'https://cdn.styleme.app/vton/job-h-1.webp',
              created_at: new Date().toISOString(),
              outfit_id: '8c7f8b1a-1234-4567-8901-abcdef123456',
            },
            {
              job_id: '6e9f2e3b-2345-4678-9012-bcdef1234567',
              status: 'failed',
              stage: 'failed',
              error_message: 'Pose no detectada',
              created_at: new Date().toISOString(),
              outfit_id: '9c8f8b1a-1234-4567-8901-abcdef123456',
            },
          ],
          total: 2,
        }),
      });
    });
  });

  test('navigates to /try-on/history, displays page heading and return link', async ({ page }) => {
    await page.goto('/try-on/history');

    await expect(page).toHaveURL(/\/try-on\/history/);
    await expect(page.getByRole('heading', { name: /Historial de pruebas/i })).toBeVisible();
    await expect(page.getByRole('img', { name: /Prueba virtual generada/i })).toBeVisible();
    await expect(page.getByText('Completado')).toBeVisible();
    await expect(page.getByText('Pose no detectada')).toBeVisible();

    const backButton = page.getByRole('link', { name: /Volver al probador/i });
    await expect(backButton).toBeVisible();
    await backButton.click();
    await expect(page).toHaveURL(/\/try-on$/);
  });
});
