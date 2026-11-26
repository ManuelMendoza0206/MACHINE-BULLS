import { expect, test } from '@playwright/test';
import { JOB_ID, OUTFIT_ID, RESULT_URL, openTryOn } from './helpers/vton';
import recommendFixture from '../fixtures/api/outfitRecommendationResponse.json';

const ALTERNATE_OUTFIT_ID = '7c8f8b1a-1234-4567-8901-abcdef123456';
const ALTERNATE_JOB_ID = '6e8f1e2a-1234-4567-8901-abcdef123456';
const ALTERNATE_RESULT_URL = 'https://cdn.styleme.test/vton/alternate.webp';

test('compara dos resultados generados con la misma foto de esta sesión', async ({ page }) => {
  let createdJobs = 0;
  await page.route('**/api/v1/outfits/recommend', route =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        outfits: [
          recommendFixture.outfits[0],
          {
            ...recommendFixture.outfits[0],
            outfit_id: ALTERNATE_OUTFIT_ID,
            aesthetic: 'minimalist',
          },
        ],
      }),
    })
  );
  await page.route('**/api/v1/vton/try-on', route => {
    createdJobs += 1;
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        job_id: createdJobs === 1 ? JOB_ID : ALTERNATE_JOB_ID,
        status: 'processing',
        estimated_time_seconds: 1,
      }),
    });
  });
  await page.route('**/api/v1/vton/status/*', route => {
    const jobId = route.request().url().split('/').pop();
    const alternate = jobId === ALTERNATE_JOB_ID;
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        job_id: jobId,
        status: 'completed',
        result_url: alternate ? ALTERNATE_RESULT_URL : RESULT_URL,
      }),
    });
  });

  await openTryOn(page);
  await page.getByRole('button', { name: 'Generar prueba virtual' }).click();
  await expect(page.getByRole('link', { name: /Guardar imagen/i })).toBeVisible({
    timeout: 15_000,
  });

  await page.getByRole('button', { name: 'Comparar con otro outfit' }).click();
  const alternate = page.getByRole('combobox', { name: 'Outfit alternativo' });
  await expect(alternate.locator('option')).toHaveCount(2);
  await alternate.selectOption(ALTERNATE_OUTFIT_ID);
  await page.getByRole('button', { name: 'Generar comparación' }).click();

  await expect(page.getByRole('region', { name: 'Comparacion visual de resultados' })).toBeVisible({
    timeout: 15_000,
  });
  await expect(page.getByRole('slider', { name: 'Comparar resultados' })).toBeVisible();
  await expect(page.getByRole('img', { name: 'Outfit old money' })).toBeVisible();
  await expect(page.getByRole('img', { name: 'Outfit minimalist' })).toBeVisible();
  expect(createdJobs).toBe(2);
});
