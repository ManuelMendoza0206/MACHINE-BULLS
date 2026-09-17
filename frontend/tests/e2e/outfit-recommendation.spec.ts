import { test } from '@playwright/test';

// outfits-flow/spec.md — "Estado vacío distingue causa raíz" +
// "Navegación de detalle sin refetch innecesario".
//
// Scaffold dejado por Leonardo (Asiento D, Sprint 2, Q1 — team-rotation-plan.md §3/§7).
// La UI real de este flujo (`/outfits`) es un stub de navegación (Sprint 1, commit
// e2593c3) — la feature completa es el epic `frontend/outfits-flow`, Sprint 4 (ver
// backlog-seed.md / team-rotation-plan.md §7.1: dueño Manuel).
//
// TODO(sprint-4, Manuel): quitar el `.skip` de cada test y completar los pasos cuando
// la UI del grid/detalle de outfits exista. Referencia de forma de datos:
// tests/fixtures/api/outfitRecommendationResponse.json.

test.skip('grid de outfits muestra chromatic_score/embedding_score y navega al detalle', async ({
  page: _page,
}) => {
  // 1. await page.goto('/outfits')
  // 2. Mockear/esperar respuesta con la forma de
  //    tests/fixtures/api/outfitRecommendationResponse.json (outfit_id, aesthetic,
  //    chromatic_score, embedding_score, garments[])
  // 3. Click en una card del grid → navegar a /outfits/[outfitId]
  // 4. Verificar que NO se dispara una nueva llamada de red para ese outfit
  //    (interceptar requests, contar) — Requirement "Navegación de detalle sin
  //    refetch innecesario"
});

test.skip('armario sin una categoría muestra el hint de categoría faltante, no un vacío genérico', async ({
  page: _page,
}) => {
  // 1. await page.goto('/outfits') con un armario mockeado que carece de una
  //    categoría (ej. sin calzado)
  // 2. Verificar que se muestra el hint con la posición exacta faltante, distinto
  //    del mensaje de "no hay combinaciones disponibles" genérico — Requirement
  //    "Estado vacío distingue causa raíz"
});
