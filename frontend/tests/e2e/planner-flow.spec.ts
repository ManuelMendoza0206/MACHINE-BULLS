import { expect, test } from '@playwright/test';
import capsuleFixture from '../fixtures/api/capsuleCatalogResponse.json';

const userId = 'aaaaaaaa-4567-4891-8901-abcdef123456';

test('agenda prendas del armario y conserva la fecha, ocasión y notas', async ({ page }) => {
  let plans: Record<string, unknown>[] = [];
  let submitted: Record<string, unknown> | undefined;
  await page.route('**/api/v1/planner*', async route => {
    if (route.request().method() === 'POST') {
      submitted = route.request().postDataJSON() as Record<string, unknown>;
      const now = new Date().toISOString();
      const plan = {
        id: 'b1f11111-2222-4333-8444-555555555555',
        user_id: userId,
        planned_date: submitted['planned_date'],
        garment_ids: submitted['garment_ids'],
        outfit_id: null,
        occasion: submitted['occasion'],
        notes: submitted['notes'] ?? null,
        status: 'PLANNED',
        created_at: now,
        updated_at: now,
      };
      plans = [plan];
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(plan),
      });
    }
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(plans),
    });
  });
  await page.route('**/api/v1/garments/capsule', route =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(capsuleFixture),
    })
  );

  await page.goto('/planner');
  await expect(page.getByRole('heading', { name: 'Planificador de vestimenta' })).toBeVisible();
  await page.getByRole('button', { name: 'Agendar conjunto' }).click();
  await page
    .locator('button')
    .filter({ has: page.locator('img[alt="shirt"]') })
    .first()
    .click();
  await page
    .locator('button')
    .filter({ has: page.locator('img[alt="pants"]') })
    .first()
    .click();
  await page.getByPlaceholder('Ej: Si llueve llevar paraguas').fill('Llevar una chaqueta');
  await page.getByRole('button', { name: 'Guardar plan' }).click();

  await expect(page.getByText('Llevar una chaqueta')).toBeVisible();
  expect(submitted?.['garment_ids']).toEqual([
    'c1a1a1a1-1111-4111-8111-111111111111',
    'c2b2b2b2-2222-4222-8222-222222222222',
  ]);
  expect(submitted?.['occasion']).toBe('Casual');
  expect(submitted?.['planned_date']).toBeTruthy();
});
