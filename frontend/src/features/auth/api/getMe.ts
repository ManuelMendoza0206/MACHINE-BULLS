import { apiRequest } from '@/lib/api/client';
import { MeResponseSchema, type MeResponse } from '@/schemas/api/me';

export function getMe(signal?: AbortSignal): Promise<MeResponse> {
  return apiRequest(
    { path: '/api/v1/me', method: 'GET', timeoutMs: 5_000, signal },
    MeResponseSchema
  );
}
