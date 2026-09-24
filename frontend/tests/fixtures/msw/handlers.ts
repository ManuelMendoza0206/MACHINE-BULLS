import { http, HttpResponse } from 'msw';
import garmentUploadResponse from '../api/garmentUploadResponse.json';
import capsuleCatalogResponse from '../api/capsuleCatalogResponse.json';

/**
 * Default (happy-path) MSW handlers, shared across integration tests. Individual tests
 * override with `server.use(...)` for error/edge cases — see `tests/fixtures/msw/server.ts`.
 *
 * `*` matches any origin so these work regardless of which `NEXT_PUBLIC_API_BASE_URL` a given
 * test file sets (each sets its own, following the existing `client.test.ts` convention).
 */
export const handlers = [
  http.post('*/api/v1/garments/upload', () => HttpResponse.json(garmentUploadResponse)),

  http.get('*/api/v1/garments/capsule', () => HttpResponse.json(capsuleCatalogResponse)),

  http.post('*/api/v1/garments/capsule/:id/adopt', () => HttpResponse.json({})),
];
