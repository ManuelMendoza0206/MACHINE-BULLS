import { apiRequest, apiRequestBlob } from '@/lib/api/client';
import { ShareLookResponseSchema, type ShareLookResponse } from '@/schemas/api/vton';

const FALLBACK_API_BASE_URL = 'http://localhost:8000';

function getApiBaseUrl(): string {
  return (process.env['NEXT_PUBLIC_API_BASE_URL'] || FALLBACK_API_BASE_URL).replace(/\/$/, '');
}

export function shareVtonJob(jobId: string, signal?: AbortSignal): Promise<ShareLookResponse> {
  return apiRequest(
    {
      path: `/api/v1/vton/${jobId}/share`,
      method: 'POST',
      timeoutMs: 10_000,
      signal,
    },
    ShareLookResponseSchema
  );
}

/**
 * Descarga autenticada del JPEG final. No se puede usar un `<a href>` plano
 * porque el endpoint exige Bearer token y el navegador no lo agrega solo.
 */
export function downloadVtonJob(jobId: string, signal?: AbortSignal): Promise<Blob> {
  return apiRequestBlob({
    path: `/api/v1/vton/${jobId}/download`,
    method: 'GET',
    timeoutMs: 30_000,
    signal,
  });
}

/** URL publica de la imagen (para la pagina /looks/[token] y su OG). */
export function getSharedLookImageUrl(token: string): string {
  return `${getApiBaseUrl()}/api/v1/vton/shared/${encodeURIComponent(token)}`;
}
