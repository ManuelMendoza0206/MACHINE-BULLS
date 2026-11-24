import { apiRequest } from '@/lib/api/client';
import { MeResponseSchema, type MeResponse } from '@/schemas/api/me';

export function uploadDefaultVtonPhoto(userImage: File, signal?: AbortSignal): Promise<MeResponse> {
  const formData = new FormData();
  formData.append('user_image', userImage);
  return apiRequest(
    {
      path: '/api/v1/me/vton-photo',
      method: 'POST',
      body: formData,
      timeoutMs: 15_000,
      signal,
    },
    MeResponseSchema
  );
}

export function deleteDefaultVtonPhoto(signal?: AbortSignal): Promise<MeResponse> {
  return apiRequest(
    {
      path: '/api/v1/me/vton-photo',
      method: 'DELETE',
      timeoutMs: 8_000,
      signal,
    },
    MeResponseSchema
  );
}
