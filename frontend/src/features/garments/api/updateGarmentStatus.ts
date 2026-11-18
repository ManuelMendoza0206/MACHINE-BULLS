import { apiRequest } from '@/lib/api/client';
import { GarmentSummary, GarmentSummarySchema } from '@/schemas/api/garments';

export function updateGarmentStatus(
  garmentId: string,
  status: 'AVAILABLE' | 'LAUNDRY' | 'REPAIR' | 'INACTIVE',
  signal?: AbortSignal
): Promise<GarmentSummary> {
  return apiRequest(
    {
      path: `/api/v1/garments/${encodeURIComponent(garmentId)}/status`,
      method: 'PATCH',
      body: { status },
      timeoutMs: 5_000,
      signal,
    },
    GarmentSummarySchema
  );
}
