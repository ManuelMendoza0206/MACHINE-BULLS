import { apiRequest } from '@/lib/api/client';
import { z } from 'zod';

const AdoptResponseSchema = z.object({
  status: z.string(),
  garment_id: z.string(),
});

export function adoptCandidateGarment(
  garmentId: string,
  signal?: AbortSignal
): Promise<{ status: string; garment_id: string }> {
  return apiRequest(
    {
      path: `/api/v1/shopping/${garmentId}/adopt`,
      method: 'POST',
      timeoutMs: 5_000,
      signal,
    },
    AdoptResponseSchema
  );
}
