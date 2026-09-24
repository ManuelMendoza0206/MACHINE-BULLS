import { z } from 'zod';
import { apiRequest } from '@/lib/api/client';
import { ApiError } from '@/lib/errors';

// docs/context/backend-plan.md §6.2 (G4): "Body vacío... crea GarmentOwnership(source='capsule');
// 409 si ya estaba adoptada — el frontend trata 409 como éxito silencioso (idempotente en
// efecto, no en respuesta)." apiRequest always parses a JSON body, so this assumes the real
// endpoint returns a minimal `{}` rather than a truly empty body — flag this to the backend
// owner if it ships as 204/no-body; `apiRequest` would need a schemaless-response path for that.
const AdoptResponseSchema = z.object({}).passthrough();

/** GAP G4 — see listCapsuleGarments.ts. */
export async function adoptCapsuleGarment(garmentId: string, signal?: AbortSignal): Promise<void> {
  try {
    await apiRequest(
      {
        path: `/api/v1/garments/capsule/${garmentId}/adopt`,
        method: 'POST',
        timeoutMs: 10_000,
        signal,
      },
      AdoptResponseSchema
    );
  } catch (error) {
    if (error instanceof ApiError && error.status === 409) {
      return; // already adopted — idempotent success, per backend-plan.md §6.2
    }
    throw error;
  }
}
