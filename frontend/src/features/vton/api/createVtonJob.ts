import { apiRequest } from '@/lib/api/client';
import {
  VtonJobCreateResponseSchema,
  type VtonJobCreateResponse,
  type VtonGarmentLayer,
} from '@/schemas/api/vton';

export function createVtonJob(
  userImage: File | null,
  outfitId: string,
  signal?: AbortSignal
): Promise<VtonJobCreateResponse> {
  const formData = new FormData();
  if (userImage) {
    formData.append('user_image', userImage);
  }
  formData.append('outfit_id', outfitId);
  return apiRequest(
    {
      path: '/api/v1/vton/try-on',
      method: 'POST',
      body: formData,
      timeoutMs: 10_000,
      signal,
    },
    VtonJobCreateResponseSchema
  );
}

export function createVtonMultilayerJob(
  userImage: File | null,
  garmentLayers: VtonGarmentLayer[],
  signal?: AbortSignal
): Promise<VtonJobCreateResponse> {
  const formData = new FormData();
  if (userImage) {
    formData.append('user_image', userImage);
  }
  formData.append('garment_layers', JSON.stringify(garmentLayers));
  return apiRequest(
    {
      path: '/api/v1/vton/try-on',
      method: 'POST',
      body: formData,
      timeoutMs: 15_000,
      signal,
    },
    VtonJobCreateResponseSchema
  );
}
