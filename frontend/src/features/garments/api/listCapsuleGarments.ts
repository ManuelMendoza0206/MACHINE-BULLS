import { apiRequest } from '@/lib/api/client';
import { CapsuleCatalogResponseSchema, type CapsuleCatalogResponse } from '@/schemas/api/garments';

/**
 * GAP G1/G4 (api-contract-gaps/spec.md): endpoint shape is documented but not confirmed by
 * the backend team. Calling this against a real deployment fails with a typed `ApiError` /
 * `NetworkError` until the gap closes — that failure is the intended, honest UI state.
 */
export function listCapsuleGarments(signal?: AbortSignal): Promise<CapsuleCatalogResponse> {
  return apiRequest(
    { path: '/api/v1/garments/capsule', method: 'GET', timeoutMs: 10_000, signal },
    CapsuleCatalogResponseSchema
  );
}
