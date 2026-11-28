import { z } from 'zod';
import { apiRequest } from '@/lib/api/client';

const DeleteGarmentResponseSchema = z.object({
  deleted: z.boolean(),
  id: z.string(),
});

export async function deleteGarment(garmentId: string, signal?: AbortSignal): Promise<void> {
  await apiRequest(
    {
      path: `/api/v1/garments/${encodeURIComponent(garmentId)}`,
      method: 'DELETE',
      timeoutMs: 10_000,
      signal,
    },
    DeleteGarmentResponseSchema
  );
}
