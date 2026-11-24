import { apiRequest } from '@/lib/api/client';
import {
  GarmentSummarySchema,
  type GarmentPosition,
  type GarmentSummary,
} from '@/schemas/api/garments';

export interface GarmentUpdatePayload {
  category?: string;
  position?: GarmentPosition;
  subcategory?: string;
  pattern?: string;
  processed_image_base64?: string;
}

export function updateGarment(
  garmentId: string,
  payload: GarmentUpdatePayload,
  signal?: AbortSignal
): Promise<GarmentSummary> {
  return apiRequest(
    {
      path: `/api/v1/garments/${encodeURIComponent(garmentId)}`,
      method: 'PATCH',
      body: payload as unknown as Record<string, unknown>,
      timeoutMs: 15_000,
      signal,
    },
    GarmentSummarySchema
  );
}
