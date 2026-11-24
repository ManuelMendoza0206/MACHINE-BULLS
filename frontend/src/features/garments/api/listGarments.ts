import { apiRequest } from '@/lib/api/client';
import { GarmentsListResponseSchema, type GarmentsListResponse } from '@/schemas/api/garments';

/**
 * Consulta el listado de prendas del usuario autenticado (GET /api/v1/garments).
 */
export function listGarments(signal?: AbortSignal): Promise<GarmentsListResponse> {
  return apiRequest(
    { path: '/api/v1/garments', method: 'GET', timeoutMs: 10_000, signal },
    GarmentsListResponseSchema
  );
}
