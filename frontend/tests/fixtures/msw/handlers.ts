import { http, HttpResponse } from 'msw';
import garmentUploadResponse from '../api/garmentUploadResponse.json';
import capsuleCatalogResponse from '../api/capsuleCatalogResponse.json';
import garmentsListResponse from '../api/garmentsListResponse.json';

/**
 * Default (happy-path) MSW handlers, shared across integration tests. Individual tests
 * override with `server.use(...)` for error/edge cases — see `tests/fixtures/msw/server.ts`.
 *
 * `*` matches any origin so these work regardless of which `NEXT_PUBLIC_API_BASE_URL` a given
 * test file sets (each sets its own, following the existing `client.test.ts` convention).
 */
export const handlers = [
  http.get('*/api/v1/me', () =>
    HttpResponse.json({
      user_id: 'aaaaaaaa-4567-4891-8901-abcdef123456',
      email: 'demo@styleme.test',
    })
  ),

  http.post('*/api/v1/garments/upload', () => HttpResponse.json(garmentUploadResponse)),

  http.get('*/api/v1/garments/capsule', () => HttpResponse.json(capsuleCatalogResponse)),

  http.post('*/api/v1/garments/capsule/:id/adopt', () => HttpResponse.json({})),

  // GAP G1 mock (api-contract-gaps/spec.md) — listado de prendas del usuario, /wardrobe
  // (wardrobe-flow/spec.md §3.4). Default fixture is non-empty so existing tests that don't
  // override this handler keep seeing the current (non-empty) WardrobeView behavior.
  http.get('*/api/v1/garments', () => HttpResponse.json(garmentsListResponse)),
];
