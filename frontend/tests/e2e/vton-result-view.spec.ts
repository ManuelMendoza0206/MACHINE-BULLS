import { expect, test } from '@playwright/test';
import { JOB_ID, RESULT_URL, openTryOn } from './helpers/vton';

const createResponse = {
  job_id: JOB_ID,
  status: 'processing',
  estimated_time_seconds: 12,
};

test('el resultado completado muestra imagen y acciones para continuar', async ({ page }) => {
  await page.route('**/api/v1/vton/try-on', route =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(createResponse),
    })
  );
  await page.route(`**/api/v1/vton/status/${JOB_ID}`, route =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        job_id: JOB_ID,
        status: 'completed',
        result_url: RESULT_URL,
        error_message: null,
      }),
    })
  );
  await openTryOn(page);
  await page.getByRole('button', { name: 'Generar prueba virtual' }).click();

  await expect(
    page.getByRole('img', { name: /Resultado de la prueba virtual con el outfit/i })
  ).toBeVisible({ timeout: 8_000 });
  await expect(page.getByRole('link', { name: 'Guardar imagen' })).toHaveAttribute(
    'href',
    RESULT_URL
  );
  await expect(page.getByRole('button', { name: 'Probar con otra foto' })).toBeVisible();
});

test('un job fallido muestra el error funcional y permite reintentarlo', async ({ page }) => {
  const reason = 'No se detectó una pose corporal válida en la imagen.';
  await page.route('**/api/v1/vton/try-on', route =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(createResponse),
    })
  );
  await page.route(`**/api/v1/vton/status/${JOB_ID}`, route =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        job_id: JOB_ID,
        status: 'failed',
        result_url: null,
        error_message: reason,
      }),
    })
  );
  await openTryOn(page);
  await page.getByRole('button', { name: 'Generar prueba virtual' }).click();

  await expect(page.locator('p[role="alert"]')).toContainText(reason, { timeout: 8_000 });
  await expect(page.getByRole('button', { name: 'Reintentar' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Probar con otra foto' })).toBeVisible();
});

test('reutiliza el resultado de la misma foto y outfit sin crear otro job', async ({ page }) => {
  let createCalls = 0;
  await page.route('**/api/v1/vton/try-on', route => {
    createCalls += 1;
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(createResponse),
    });
  });
  await page.route(`**/api/v1/vton/status/${JOB_ID}`, route =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        job_id: JOB_ID,
        status: 'completed',
        result_url: RESULT_URL,
        error_message: null,
      }),
    })
  );
  await openTryOn(page);
  await page.getByRole('button', { name: 'Generar prueba virtual' }).click();
  await expect(page.getByRole('link', { name: 'Guardar imagen' })).toBeVisible({ timeout: 8_000 });
  await page.getByRole('button', { name: 'Probar con otra foto' }).click();
  await page.getByLabel('Seleccionar fotos de prendas').setInputFiles({
    name: 'foto-prueba.jpg',
    mimeType: 'image/jpeg',
    buffer: Buffer.from('playwright-test-image'),
  });
  await page.getByRole('button', { name: 'Generar prueba virtual' }).click();

  await expect(page.getByRole('link', { name: 'Guardar imagen' })).toBeVisible();
  expect(createCalls).toBe(1);
});
