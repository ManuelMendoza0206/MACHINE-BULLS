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

  http.get('*/api/v1/shopping/weather', () =>
    HttpResponse.json({
      city: 'La Paz',
      temp_c: 15.0,
      condition: 'Mild / Season',
      weather_type: 'mild',
      is_raining: false,
      source: 'mock',
    })
  ),

  http.get('*/api/v1/garments/analytics', () =>
    HttpResponse.json({
      total_garments: 5,
      utilization_rate: 60.0,
      most_worn_garments: [],
      unworn_garments: [],
      wardrobe_gaps: [],
    })
  ),

  http.post('*/api/v1/outfits/:id/wear', () =>
    HttpResponse.json({
      id: 'log-1',
      user_id: 'u-1',
      outfit_id: 'o-1',
      worn_date: '2026-11-07',
      created_at: '2026-11-07T12:00:00Z',
    })
  ),

  http.post('*/api/v1/outfits/:id/feedback', () =>
    HttpResponse.json({
      id: 'fb-1',
      user_id: 'u-1',
      outfit_id: 'o-1',
      rating: 1,
      feedback_type: 'like',
      created_at: '2026-11-07T12:00:00Z',
    })
  ),

  http.post('*/api/v1/me/purge-photos', () =>
    HttpResponse.json({
      status: 'ok',
      purged_count: 0,
      message: 'OK',
    })
  ),

  http.patch('*/api/v1/garments/:id/status', async ({ request }) => {
    const body = (await request.json().catch(() => ({}))) as { status?: string };
    return HttpResponse.json({
      id: 'mock-garment-1',
      category: 'shirt',
      position: 'top',
      dominant_aesthetic: 'casual',
      processed_image_url: 'https://example.com/mock.png',
      status: body.status || 'AVAILABLE',
    });
  }),

  http.post('*/api/v1/outfits/remix', () =>
    HttpResponse.json({
      outfits: [],
    })
  ),

  http.get('*/api/v1/planner', () => HttpResponse.json([])),

  http.post('*/api/v1/planner', async ({ request }) => {
    const body = (await request.json().catch(() => ({}))) as {
      planned_date?: string;
      garment_ids?: string[];
    };
    return HttpResponse.json({
      id: 'plan-mock-1',
      user_id: 'aaaaaaaa-4567-4891-8901-abcdef123456',
      planned_date: body.planned_date || '2026-11-20',
      garment_ids: body.garment_ids || [],
      outfit_id: null,
      occasion: 'Casual',
      notes: null,
      status: 'PLANNED',
      created_at: '2026-11-07T12:00:00Z',
      updated_at: '2026-11-07T12:00:00Z',
    });
  }),

  http.patch('*/api/v1/planner/:id/confirm', () =>
    HttpResponse.json({
      plan: {
        id: 'plan-mock-1',
        user_id: 'aaaaaaaa-4567-4891-8901-abcdef123456',
        planned_date: '2026-11-20',
        garment_ids: [],
        outfit_id: null,
        occasion: 'Casual',
        notes: null,
        status: 'COMPLETED',
        created_at: '2026-11-07T12:00:00Z',
        updated_at: '2026-11-07T12:00:00Z',
      },
      usage_logged: true,
      garments_marked_laundry: [],
    })
  ),

  http.delete('*/api/v1/planner/:id', () =>
    HttpResponse.json({
      deleted: true,
    })
  ),
];
