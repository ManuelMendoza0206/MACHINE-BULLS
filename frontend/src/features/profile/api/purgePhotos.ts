import { apiRequest } from '@/lib/api/client';
import { z } from 'zod';

const PurgeResponseSchema = z.object({
  status: z.string(),
  purged_count: z.number(),
  message: z.string(),
});

export function purgePhotos(
  signal?: AbortSignal
): Promise<{ status: string; purged_count: number; message: string }> {
  return apiRequest(
    {
      path: '/api/v1/me/purge-photos',
      method: 'POST',
      timeoutMs: 5_000,
      signal,
    },
    PurgeResponseSchema
  );
}
