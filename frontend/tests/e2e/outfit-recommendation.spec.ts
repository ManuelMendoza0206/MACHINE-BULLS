import { expect, test } from '@playwright/test';
import outfitsFixture from '../fixtures/api/outfitRecommendationResponse.json';
import capsuleFixture from '../fixtures/api/capsuleCatalogResponse.json';

const outfitId = '8c7f8b1a-1234-4567-8901-abcdef123456';

async function mockOutfitPage(page: import('@playwright/test').Page, recommendStatus = 200) {
  let recommendationCalls = 0;
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
  await page.route('**/api/v1/shopping/weather**', route =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        city: 'La Paz',
        temp_c: 15,
        condition: 'Cool',
        weather_type: 'mild',
        is_raining: false,
        source: 'fallback',
      }),
    })
  );
  await page.route('**/api/v1/garments/capsule', route =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(capsuleFixture),
    })
  );
  await page.route('**/api/v1/outfits/recommend', route => {
    recommendationCalls += 1;
    return route.fulfill({
      status: recommendStatus,
      contentType: 'application/json',
      body:
        recommendStatus === 200
          ? JSON.stringify(outfitsFixture)
          : JSON.stringify({ detail: 'Te falta una prenda inferior para armar combinaciones.' }),
    });
  });
  await page.route(`**/api/v1/outfits/${outfitId}`, route =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(outfitsFixture.outfits[0]),
    })
  );
  return () => recommendationCalls;
}

test('muestra scores y abre el probador sin volver a recomendar', async ({ page }) => {
  const recommendationCalls = await mockOutfitPage(page);

  await page.goto('/outfits');
  await expect(page.getByText('Armonía cromática')).toBeVisible();
  await expect(page.getByText('92%')).toBeVisible();
  await expect.poll(recommendationCalls).toBe(1);
  const callsBeforeNavigation = recommendationCalls();
  await page.getByRole('button', { name: 'Probar puesto' }).click();

  await expect(page).toHaveURL(new RegExp(`/try-on\\?outfit=${outfitId}`));
  await expect(page.getByRole('heading', { name: 'Outfit a probar' })).toBeVisible();
  expect(recommendationCalls()).toBe(callsBeforeNavigation);
});

test('explica la categoría faltante cuando el armario no permite recomendar', async ({ page }) => {
  await mockOutfitPage(page, 400);

  await page.goto('/outfits');

  await expect(
    page.getByText('Te falta una prenda inferior para armar combinaciones.')
  ).toBeVisible();
  await expect(page.getByRole('button', { name: /Completar el armario/i })).toBeVisible();
});
