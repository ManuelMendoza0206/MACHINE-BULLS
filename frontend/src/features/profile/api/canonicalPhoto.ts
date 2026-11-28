import { apiRequest } from '@/lib/api/client';
import {
  CanonicalPhotoResponseSchema,
  type CanonicalPhotoResponse,
} from '@/schemas/api/me';

export function getCanonicalPhoto(signal?: AbortSignal): Promise<CanonicalPhotoResponse> {
  return apiRequest(
    {
      path: '/api/v1/me/canonical-photo',
      method: 'GET',
      timeoutMs: 10_000,
      signal,
    },
    CanonicalPhotoResponseSchema
  );
}

export function uploadCanonicalPhoto(
  file: File,
  consent: boolean,
  signal?: AbortSignal
): Promise<CanonicalPhotoResponse> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('consent', String(consent));

  return apiRequest(
    {
      path: '/api/v1/me/canonical-photo',
      method: 'POST',
      body: formData,
      timeoutMs: 60_000,
      signal,
    },
    CanonicalPhotoResponseSchema
  );
}

export function deleteCanonicalPhoto(signal?: AbortSignal): Promise<CanonicalPhotoResponse> {
  return apiRequest(
    {
      path: '/api/v1/me/canonical-photo',
      method: 'DELETE',
      timeoutMs: 15_000,
      signal,
    },
    CanonicalPhotoResponseSchema
  );
}
