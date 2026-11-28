import { expect, type Page } from '@playwright/test';
import capsuleFixture from '../../fixtures/api/capsuleCatalogResponse.json';

export const OUTFIT_ID = '8c7f8b1a-1234-4567-8901-abcdef123456';
export const JOB_ID = '5d8f1e2a-1234-4567-8901-abcdef123456';
export const RESULT_URL = 'https://cdn.styleme.test/vton/result.webp';

const outfit = {
  outfit_id: OUTFIT_ID,
  aesthetic: 'old_money',
  chromatic_score: 0.92,
  embedding_score: 0.87,
  garments: [
    { garment_id: '3fa85f64-5717-4562-b3fc-2c963f66afa6', position: 'top' },
    { garment_id: '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d', position: 'bottom' },
    { garment_id: '1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d', position: 'footwear' },
  ],
};

export async function openTryOn(page: Page): Promise<void> {
  await page.route('**/api/v1/me', route =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        user_id: 'aaaaaaaa-4567-4891-8901-abcdef123456',
        email: 'demo@test.dev',
      }),
    })
  );
  await page.route('**/api/v1/outfits/*', route => {
    if (route.request().method() !== 'GET') return route.fallback();
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(outfit),
    });
  });
  await page.route('**/api/v1/garments/capsule', route =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(capsuleFixture),
    })
  );

  await page.goto(`/try-on?outfit=${OUTFIT_ID}`);
  await page.getByRole('button', { name: /Acepto y quiero continuar/i }).click();
  await page.getByLabel('Seleccionar fotos de prendas').setInputFiles({
    name: 'foto-prueba.jpg',
    mimeType: 'image/jpeg',
    buffer: Buffer.from('playwright-test-image'),
  });
  await expect(page.getByRole('button', { name: 'Generar prueba virtual' })).toBeEnabled();
}
