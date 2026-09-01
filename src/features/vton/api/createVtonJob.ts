import { apiRequest } from '@/lib/api/client';
import { VtonJobCreateResponseSchema, type VtonJobCreateResponse } from '@/schemas/api/vton';

export function createVtonJob(
  userImage: File,
  outfitId: string,
  signal?: AbortSignal
): Promise<VtonJobCreateResponse> {
  const formData = new FormData();
  formData.append('user_image', userImage);
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
