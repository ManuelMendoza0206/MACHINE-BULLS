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

  http.get('*/api/v1/shopping/weather', ({ request }) => {
    const url = new URL(request.url);
    const city = url.searchParams.get('city');
    const lat = url.searchParams.get('lat');
    const resolvedCity = city || (lat ? 'Tu ubicación' : 'La Paz');
    const weatherType = resolvedCity.toLowerCase().includes('santa cruz') ? 'warm' : 'mild';
    return HttpResponse.json({
      city: resolvedCity,
      temp_c: weatherType === 'warm' ? 28.0 : 15.0,
      condition: weatherType === 'warm' ? 'Clear' : 'Mild / Season',
      weather_type: weatherType,
      is_raining: false,
      source: 'mock',
    });
  }),

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

  http.post('*/api/v1/outfits/:id/stylist-advice', ({ params }) =>
    HttpResponse.json({
      outfit_id: String(params['id'] ?? 'o-1'),
      why_it_works: 'El contraste neutro equilibra proporciones superiores e inferiores.',
      accessories: ['Reloj minimalista plateado', 'Bolso tote estructurado'],
      grooming_and_footwear: 'Mocasines limpios o zapatillas blancas y peinado natural.',
      event_adaptation: 'Suma un blazer oscuro para elevar el conjunto hacia la noche.',
      source: 'azure_openai',
      model: 'styleme-gpt-5-mini',
      cached: false,
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

  http.patch('*/api/v1/garments/:id', async ({ request, params }) => {
    const body = (await request.json().catch(() => ({}))) as {
      category?: string;
      position?: string;
    };
    return HttpResponse.json({
      id: String(params['id'] ?? 'b7e4c1d2-9012-4345-8678-90abcdef1234'),
      category: body.category || 'shirt',
      position: body.position || 'top',
      dominant_aesthetic: 'old_money',
      processed_image_url: 'https://cdn.example.com/garments/edited.webp',
      status: 'AVAILABLE',
    });
  }),

  http.delete('*/api/v1/garments/:id', ({ params }) =>
    HttpResponse.json({
      deleted: true,
      id: String(params['id'] ?? 'd1a1a1a1-1111-4111-8111-111111111111'),
    })
  ),

  http.post('*/api/v1/outfits/remix', () =>
    HttpResponse.json({
      outfits: [],
    })
  ),

  http.post('*/api/v1/outfits/evaluate-manual', async ({ request }) => {
    const body = (await request.json().catch(() => ({}))) as {
      garment_ids?: string[];
      occasion?: string;
      weather?: string;
    };
    const ids =
      body.garment_ids && body.garment_ids.length > 0
        ? body.garment_ids
        : ['d1a1a1a1-1111-4111-8111-111111111111'];
    return HttpResponse.json({
      outfit_id: '77777777-1234-4567-8901-abcdef123456',
      aesthetic: 'old_money',
      garments: ids.map((id, i) => ({
        garment_id: id,
        position: i === 0 ? 'top' : i === 1 ? 'bottom' : 'outerwear',
      })),
      chromatic_score: 0.89,
      embedding_score: 0.84,
      occasion: body.occasion ?? null,
      weather: body.weather ?? null,
      reason: 'Alta armonía de color (89%), equilibrio entre estampado y piezas lisas.',
    });
  }),

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
