import { test, expect, type Page } from '@playwright/test';
import garmentFixture from '../fixtures/api/garmentUploadResponse.json';

// wardrobe-flow/spec.md — "Subida por lote con techo de concurrencia" +
// "Resultado de análisis editable antes de confirmar".
//
// Scaffold left by Leonardo (Asiento D, Sprint 2, Q1 — team-rotation-plan.md §3/§7), completed
// here (Huascar, Sprint 3, sprint-3-init-huascar.md Tarea 1) now that the upload UI exists.
// Network is mocked via page.route() (no MSW in the browser context) against the same fixture
// shape unit/integration tests use. A 1×1 PNG is used as the "photo" — laplacianVariance
// deterministically flags anything smaller than 3×3 as blurry (0 variance), so every flow here
// passes through the non-blocking blur-warning step before uploading, same as a real blurry photo.

// The smallest valid PNG (1×1, transparent) — no binary fixture file needed.
const TINY_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64'
);

function garmentFile(name: string): { name: string; mimeType: string; buffer: Buffer } {
  return { name, mimeType: 'image/png', buffer: TINY_PNG };
}

async function acceptConsent(page: Page): Promise<void> {
  await page.getByRole('button', { name: /acepto/i }).click();
}

/** Clicks every "Subir de todas formas" (blur-warning) button, one at a time, waiting for
 * each to appear — `detectBlur` is a real async canvas decode, items don't all reach
 * blur-warning simultaneously. New items can mount later (once promoted from the queue), so
 * callers re-invoke this whenever more items might have appeared. */
async function pushPastBlurWarnings(page: Page, maxClicks = 10): Promise<void> {
  const button = page.getByRole('button', { name: /subir de todas formas/i }).first();
  for (let i = 0; i < maxClicks; i += 1) {
    try {
      await button.click({ timeout: 1000 });
    } catch {
      return; // no (more) blur-warning buttons appeared within the wait window
    }
  }
}

test.beforeEach(async ({ page }) => {
  await page.goto('/wardrobe');
  await acceptConsent(page);
});

test('sube 1 prenda válida → aparece en el resultado de análisis, editable antes de confirmar', async ({
  page,
}) => {
  let uploadCalls = 0;
  await page.route('**/api/v1/garments/upload', route => {
    uploadCalls += 1;
    return route.fulfill({ json: garmentFixture });
  });

  await page.getByLabel(/seleccionar fotos/i).setInputFiles(garmentFile('shirt.png'));

  // Non-blocking blur warning (1×1 image is always flagged) — submit anyway.
  await expect(page.getByText(/foto borrosa/i)).toBeVisible();
  await pushPastBlurWarnings(page);

  const categoryInput = page.getByLabel('Categoría');
  await expect(categoryInput).toHaveValue(garmentFixture.category);
  expect(uploadCalls).toBe(1);

  // Editable — not read-only text.
  await categoryInput.fill('jacket');
  await page.getByRole('button', { name: /confirmar/i }).click();

  // The edited value, not the original detected one, is what's confirmed.
  await expect(page.getByText('Confirmada')).toBeVisible();
  await expect(page.getByText('jacket', { exact: true })).toBeVisible();
});

test('lote que excede el techo de concurrencia encola el excedente sin bloquear el resto', async ({
  page,
}) => {
  // Hold every upload pending so the active/queued split is observable before anything settles.
  let resolveUploads: (() => void) | undefined;
  const gate = new Promise<void>(resolve => (resolveUploads = resolve));
  let requestCount = 0;

  await page.route('**/api/v1/garments/upload', async route => {
    requestCount += 1;
    // Snapshot this request's own arrival order — `requestCount` keeps changing while every
    // handler invocation sits at `await gate` below, so reading it *after* the await would see
    // whatever it ends up at, not the value when this particular request arrived.
    const arrivalOrder = requestCount;
    await gate;
    // One request (arbitrary — the first to arrive) fails; the rest succeed. Verifies "one
    // failure never blocks the rest" in the same pass.
    if (arrivalOrder === 1) {
      return route.fulfill({ status: 500, json: { message: 'boom' } });
    }
    return route.fulfill({ json: garmentFixture });
  });

  const files = Array.from({ length: 6 }, (_, i) => garmentFile(`g${i}.png`));
  await page.getByLabel(/seleccionar fotos/i).setInputFiles(files);

  await expect(page.getByText(/en cola/i).first()).toBeVisible();
  const queuedCountBefore = await page.getByText(/en cola/i).count();
  expect(queuedCountBefore).toBeGreaterThan(0);
  expect(queuedCountBefore).toBeLessThan(6);

  // Push the initially-active items (currently gated in "uploading") past their own blur
  // warnings first — before the network gate ever opens, so this doesn't race the promotions.
  await pushPastBlurWarnings(page);
  resolveUploads?.();

  // The freed slots promote the queued items, which mount and hit their own blur warning.
  await expect(async () => {
    await pushPastBlurWarnings(page);
    expect(await page.getByText(/en cola/i).count()).toBe(0);
  }).toPass({ timeout: 10_000 });

  // One error card, the rest reached the editable review state — nothing stuck in "en cola"
  // forever, and the one failure didn't take the batch down with it.
  await expect(page.getByText(/error al subir/i)).toBeVisible();
  await expect(page.getByLabel('Categoría').first()).toBeVisible();
});

test('imagen borrosa se rechaza/advierte antes de gastar la llamada de red', async ({ page }) => {
  let uploadCalls = 0;
  await page.route('**/api/v1/garments/upload', route => {
    uploadCalls += 1;
    return route.fulfill({ json: garmentFixture });
  });

  await page.getByLabel(/seleccionar fotos/i).setInputFiles(garmentFile('blurry.png'));

  await expect(page.getByText(/foto borrosa/i)).toBeVisible();
  // The warning is informational — no upload has fired yet.
  expect(uploadCalls).toBe(0);

  await pushPastBlurWarnings(page);
  await expect(page.getByLabel('Categoría')).toHaveValue(garmentFixture.category);
  expect(uploadCalls).toBe(1);
});
