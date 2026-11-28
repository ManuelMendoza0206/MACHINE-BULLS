import { apiRequest } from '@/lib/api/client';
import {
  VtonJobCreateResponseSchema,
  type VtonJobCreateResponse,
  type VtonGarmentLayer,
} from '@/schemas/api/vton';

export interface VtonOptions {
  steps?: number;
  guidance?: number;
  seed?: number;
  layerMode?: 'sequential' | 'from_original';
  useCanonical?: boolean;
}

export function createVtonJob(
  userImage: File | null | undefined,
  outfitId: string,
  options?: VtonOptions,
  signal?: AbortSignal
): Promise<VtonJobCreateResponse> {
  const formData = new FormData();
  if (userImage) {
    formData.append('user_image', userImage);
  }
  if (options?.useCanonical) {
    formData.append('use_canonical', 'true');
  }
  if (options?.steps) {
    formData.append('steps', options.steps.toString());
  }
  if (options?.guidance) {
    formData.append('guidance', options.guidance.toString());
  }
  if (options?.seed !== undefined) {
    formData.append('seed', options.seed.toString());
  }
  if (options?.layerMode) {
    formData.append('layer_mode', options.layerMode);
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
  userImage: File | null | undefined,
  garmentLayers: VtonGarmentLayer[],
  options?: VtonOptions,
  signal?: AbortSignal
): Promise<VtonJobCreateResponse> {
  const formData = new FormData();
  if (userImage) {
    formData.append('user_image', userImage);
  }
  if (options?.useCanonical) {
    formData.append('use_canonical', 'true');
  }
  if (options?.steps) {
    formData.append('steps', options.steps.toString());
  }
  if (options?.guidance) {
    formData.append('guidance', options.guidance.toString());
  }
  if (options?.seed !== undefined) {
    formData.append('seed', options.seed.toString());
  }
  if (options?.layerMode) {
    formData.append('layer_mode', options.layerMode);
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
