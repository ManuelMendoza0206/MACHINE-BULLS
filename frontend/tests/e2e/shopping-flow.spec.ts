import { expect, test } from '@playwright/test';

const candidateId = 'd3b3b3b3-3333-4333-8333-333333333333';

const evaluation = {
  candidate_garment: {
    garment_id: candidateId,
    category: 'shirt',
    position: 'top',
    top_aesthetics: [{ aesthetic: 'casual', confidence: 0.91 }],
    dominant_colors: [{ h: 210, s: 40, v: 60, hex: '#5c7d99' }],
    processed_image_url: 'https://cdn.styleme.test/garments/candidate.webp',
  },
  compatible_garments_count: 2,
  potential_outfits_count: 1,
  redundancy: {
    is_redundant: false,
    similar_garment_id: null,
    similarity: 0.12,
    message: 'No hay una prenda demasiado parecida en tu armario.',
  },
  verdict: 'La prenda aporta combinaciones nuevas.',
  potential_outfits: [],
};

test('evalúa una prenda de tienda y permite añadirla al armario', async ({ page }) => {
  let adoptedId: string | undefined;
  await page.route('**/api/v1/shopping/evaluate', route =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(evaluation),
    })
  );
  await page.route(`**/api/v1/shopping/${candidateId}/adopt`, async route => {
    adoptedId = candidateId;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ status: 'adopted', garment_id: candidateId }),
    });
  });

  await page.goto('/shopping');
  await page.locator('input[type="file"]').setInputFiles({
    name: 'prenda-tienda.jpg',
    mimeType: 'image/jpeg',
    buffer: Buffer.from('shopping-e2e-image'),
  });

  await expect(page.getByText('La prenda aporta combinaciones nuevas.')).toBeVisible();
  await expect(page.getByText('Prendas compatibles')).toBeVisible();
  await expect(page.getByText('Combinaciones posibles')).toBeVisible();
  await page.getByRole('button', { name: 'Agregar a mi armario' }).click();

  await expect(page.getByRole('button', { name: 'En tu armario' })).toBeVisible();
  expect(adoptedId).toBe(candidateId);
});
