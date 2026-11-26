import { expect, test } from '@playwright/test';
import { JOB_ID, OUTFIT_ID, RESULT_URL, openTryOn } from './helpers/vton';

const createResponse = {
  job_id: JOB_ID,
  status: 'processing',
  estimated_time_seconds: 12,
};

test('un doble click crea un solo job y envía el outfit elegido', async ({ page }) => {
  let createCalls = 0;
  let requestBody = '';
  await page.route('**/api/v1/vton/try-on', async route => {
    createCalls += 1;
    requestBody = route.request().postData() ?? '';
    await new Promise(resolve => setTimeout(resolve, 400));
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(createResponse),
    });
  });
  await page.route(`**/api/v1/vton/status/${JOB_ID}`, route =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ job_id: JOB_ID, status: 'processing' }),
    })
  );
  await openTryOn(page);

  const submit = page.getByRole('button', { name: 'Generar prueba virtual' });
  await submit.dblclick();

  await expect(page.getByRole('button', { name: 'Procesando en el probador…' })).toBeDisabled();
  expect(createCalls).toBe(1);
  expect(requestBody).toContain('outfit_id');
  expect(requestBody).toContain(OUTFIT_ID);
  expect(requestBody).not.toContain('garment_layers');
});

test('polling muestra el resultado completado sin cancelar el job', async ({ page }) => {
  const cancelled: string[] = [];
  let polls = 0;
  page.on('request', request => {
    if (request.method() === 'DELETE' && request.url().includes('/api/v1/vton/')) {
      cancelled.push(request.url());
    }
  });
  await page.route('**/api/v1/vton/try-on', route =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(createResponse),
    })
  );
  await page.route(`**/api/v1/vton/status/${JOB_ID}`, route => {
    polls += 1;
    const status = polls < 3 ? 'processing' : 'completed';
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        job_id: JOB_ID,
        status,
        result_url: status === 'completed' ? RESULT_URL : null,
        error_message: null,
      }),
    });
  });
  await openTryOn(page);
  await page.getByRole('button', { name: 'Generar prueba virtual' }).click();

  await expect(
    page.getByRole('img', { name: /Resultado de la prueba virtual con el outfit/i })
  ).toBeVisible({ timeout: 15_000 });
  expect(polls).toBeGreaterThanOrEqual(3);
  expect(cancelled).toEqual([]);
});
