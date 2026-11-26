import { apiRequest } from '@/lib/api/client';
import { GarmentSummarySchema } from '@/schemas/api/garments';

export function updateGarmentStatus(
  garmentId: string,
  status: 'AVAILABLE' | 'LAUNDRY' | 'REPAIR' | 'INACTIVE'
) {
  return apiRequest(
    {
      path: `/api/v1/garments/${encodeURIComponent(garmentId)}/status`,
      method: 'PATCH',
      body: { status },
      timeoutMs: 10_000,
    },
    GarmentSummarySchema
  );
}
