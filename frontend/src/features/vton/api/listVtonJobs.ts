import { apiRequest } from '@/lib/api/client';
import { VtonJobListResponseSchema, type VtonJobListResponse } from '@/schemas/api/vton';

/**
 * Consulta el historial de jobs VTON del usuario (GET /api/v1/vton/jobs, Gap G3).
 */
export function listVtonJobs(limit = 50, signal?: AbortSignal): Promise<VtonJobListResponse> {
  return apiRequest(
    {
      path: `/api/v1/vton/jobs?limit=${limit}`,
      method: 'GET',
      timeoutMs: 10_000,
      signal,
    },
    VtonJobListResponseSchema
  );
}
