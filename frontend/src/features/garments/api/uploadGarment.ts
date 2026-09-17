import { apiRequest } from '@/lib/api/client';
import { GarmentUploadResponseSchema, type GarmentUploadResponse } from '@/schemas/api/garments';

export function uploadGarment(file: File, signal?: AbortSignal): Promise<GarmentUploadResponse> {
  const formData = new FormData();
  formData.append('file', file);
  return apiRequest(
    {
      path: '/api/v1/garments/upload',
      method: 'POST',
      body: formData,
      timeoutMs: 20_000,
      signal,
    },
    GarmentUploadResponseSchema
  );
}
