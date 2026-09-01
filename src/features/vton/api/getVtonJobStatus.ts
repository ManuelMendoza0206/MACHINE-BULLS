import { apiRequest } from '@/lib/api/client';
import { VtonJobStatusResponseSchema, type VtonJobStatusResponse } from '@/schemas/api/vton';

export function getVtonJobStatus(
  jobId: string,
  signal?: AbortSignal
): Promise<VtonJobStatusResponse> {
  return apiRequest(
    {
      path: `/api/v1/vton/status/${encodeURIComponent(jobId)}`,
      method: 'GET',
      timeoutMs: 5_000,
      signal,
    },
    VtonJobStatusResponseSchema
  );
}
