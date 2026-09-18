import { test } from '@playwright/test';

// vton-flow/spec.md — "Reuso de resultados cacheados" + visualización de resultado
// (Purpose: "presenta el resultado o el fallo de forma accionable").
//
// Scaffold dejado por Leonardo (Asiento D, Sprint 2, Q1 — team-rotation-plan.md §3/§7).
// La UI real de este flujo es un stub de navegación (Sprint 1, commit e2593c3) — la
// feature completa es el epic `frontend/vton-flow`, Sprint 6 (dueño Jaicel,
// team-rotation-plan.md §7.1).
//
// TODO(sprint-6, Jaicel): quitar el `.skip` de cada test y completar los pasos cuando
// la UI de resultado exista. Referencia de forma de datos:
// tests/fixtures/api/vtonJobStatusResponse.json (estados completed/failed).

test.skip('job completado muestra result_url de forma accionable (compartir/reintentar)', async ({
  page: _page,
}) => {
  // 1. Mockear GET /api/v1/vton/status/{job_id} → estado "completed" con
  //    result_url (tests/fixtures/api/vtonJobStatusResponse.json → completed)
  // 2. Verificar que la imagen de resultado se muestra
  // 3. Verificar que hay una acción siguiente accionable (compartir, guardar,
  //    reintentar con otro outfit) — no solo la imagen sin contexto
});

test.skip('job fallido muestra error_message de forma accionable, no un mensaje técnico', async ({
  page: _page,
}) => {
  // 1. Mockear GET /api/v1/vton/status/{job_id} → estado "failed" con
  //    error_message ("No se detectó una pose corporal válida en la imagen.")
  // 2. Verificar que el mensaje mostrado al usuario es el de negocio (no un stack
  //    trace ni un código de error crudo) y ofrece una acción (reintentar con otra
  //    foto)
});

test.skip('la misma combinación (outfit, foto) ya generada navega al resultado cacheado sin nuevo job', async ({
  page: _page,
}) => {
  // 1. Generar un resultado completado para (outfit A, foto X) en la sesión
  // 2. Solicitar try-on de nuevo con la misma combinación (outfit A, foto X)
  // 3. Interceptar POST /api/v1/vton/try-on → verificar que NO se dispara, y que
  //    navega directo al resultado cacheado — Requirement "Reuso de resultados
  //    cacheados"
});
