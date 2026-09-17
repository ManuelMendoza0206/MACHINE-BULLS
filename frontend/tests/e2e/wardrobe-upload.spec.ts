import { test } from '@playwright/test';

// wardrobe-flow/spec.md — "Subida por lote con techo de concurrencia" +
// "Resultado de análisis editable antes de confirmar".
//
// Scaffold dejado por Leonardo (Asiento D, Sprint 2, Q1 — team-rotation-plan.md §3/§7).
// La UI real de este flujo (`/wardrobe`) es un stub de navegación (Sprint 1, commit
// e2593c3) — la feature completa es el epic `frontend/wardrobe-flow` de Huascar,
// Sprint 3 (ver docs/sprint-plans/sprint-3/sprint-3-init-huascar.md, Tarea 1-2).
//
// TODO(sprint-3, Huascar): quitar el `.skip` de cada test y completar los pasos
// (selectores reales, mocks de red) cuando la UI de subida exista. No escribir un
// spec nuevo desde cero — este ya referencia los Requirements y la forma de datos
// esperada (tests/fixtures/api/garmentUploadResponse.json).

test.skip('sube 1 prenda válida → aparece en el resultado de análisis, editable antes de confirmar', async ({
  page: _page,
}) => {
  // 1. await page.goto('/wardrobe')
  // 2. Seleccionar 1 archivo de imagen válido (input file o drag-and-drop)
  // 3. Esperar a que pase por detectBlur (frontend/src/lib/vision/detectBlur.ts) sin
  //    marcarse como borrosa
  // 4. Mockear o esperar la respuesta real con la forma de
  //    tests/fixtures/api/garmentUploadResponse.json (category, top_aesthetics,
  //    dominant_colors, processed_image_url)
  // 5. Confirmar que el resultado se muestra en un formulario EDITABLE (no solo texto
  //    de solo lectura) — Requirement "Resultado de análisis editable antes de confirmar"
  // 6. Editar la categoría → confirmar → verificar que el valor editado (no el
  //    original detectado) es el que se persiste
});

test.skip('lote que excede el techo de concurrencia encola el excedente sin bloquear el resto', async ({
  page: _page,
}) => {
  // 1. await page.goto('/wardrobe')
  // 2. Seleccionar N archivos, N > techo de concurrencia de uploadQueue
  //    (frontend/src/features/garments/lib/uploadQueue.ts)
  // 3. Verificar que como máximo "techo" requests están activos a la vez
  // 4. Verificar que el excedente queda en estado `queued`, procesado FIFO
  // 5. Simular fallo de 1 archivo activo → verificar que NO bloquea el resto de la cola
  //    — Requirement "Subida por lote con techo de concurrencia", escenario
  //    "Exceso de archivos en un lote"
});

test.skip('imagen borrosa se rechaza/advierte antes de gastar la llamada de red', async ({
  page: _page,
}) => {
  // 1. await page.goto('/wardrobe')
  // 2. Seleccionar una imagen con blur detectable por
  //    frontend/src/lib/vision/detectBlur.ts / laplacianVariance.ts
  // 3. Verificar que se muestra advertencia/rechazo ANTES de que se dispare la
  //    llamada de red de subida (interceptar la request y verificar que no ocurre)
});
