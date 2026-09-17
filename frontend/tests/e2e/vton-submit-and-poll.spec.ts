import { test } from '@playwright/test';

// vton-flow/spec.md — "Polling con backoff y timeout local sin cancelar el job" +
// "Protección contra doble-submit en la mutación más costosa" +
// "Soporte multicapa con orden por posición".
//
// Scaffold dejado por Leonardo (Asiento D, Sprint 2, Q1 — team-rotation-plan.md §3/§7).
// La UI real de este flujo (`/try-on`) es un stub de navegación (Sprint 1, commit
// e2593c3) — la feature completa es el epic `frontend/vton-flow`, Sprint 6 (dueño
// Jaicel, team-rotation-plan.md §7.1). El backend (`backend/vton-pipeline`) es
// Sprint 5, Leonardo — coordinar entre ambos al implementar.
//
// TODO(sprint-6, Jaicel): quitar el `.skip` de cada test y completar los pasos cuando
// la UI de try-on exista. Referencia de forma de datos:
// tests/fixtures/api/{vtonJobCreateResponse,vtonJobStatusResponse}.json.

test.skip('doble click en "Generar prueba virtual" dispara una sola creación de job', async ({
  page: _page,
}) => {
  // 1. await page.goto('/try-on') con outfit/foto ya seleccionados
  // 2. Interceptar POST /api/v1/vton/try-on, contar llamadas
  // 3. Doble click rápido en el CTA antes de que la primera respuesta resuelva
  // 4. Verificar: exactamente 1 llamada de creación de job (no 2) — Requirement
  //    "Protección contra doble-submit en la mutación más costosa"
});

test.skip('polling respeta backoff y timeout local sin cancelar el job en backend', async ({
  page: _page,
}) => {
  // 1. Mockear GET /api/v1/vton/status/{job_id} para responder siempre "processing"
  //    (tests/fixtures/api/vtonJobStatusResponse.json → processing)
  // 2. Verificar que los intervalos de polling siguen backoff exponencial, no un
  //    intervalo fijo
  // 3. Alcanzar el techo de tiempo configurado → verificar que la UI muestra estado
  //    de timeout LOCAL, y que NO se envía ninguna llamada de cancelación al backend
  //    — Requirement "Polling con backoff y timeout local sin cancelar el job"
});

test.skip('try-on multicapa envía garment_layers en orden por posición', async ({
  page: _page,
}) => {
  // 1. await page.goto('/try-on')
  // 2. Seleccionar prendas individuales por posición (top/bottom/footwear/outerwear),
  //    sin outfit pre-armado
  // 3. Confirmar try-on → interceptar el POST y verificar que `garment_layers` va
  //    ordenado por posición — Requirement "Soporte multicapa con orden por posición"
  //    (ver frontend/src/features/vton/api/createVtonJob.ts, ya soporta esto desde
  //    el PR #16 "adapta flujo multicapa")
});
