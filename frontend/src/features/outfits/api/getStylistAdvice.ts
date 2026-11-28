import { apiRequest } from '@/lib/api/client';
import {
  StylistAdviceResponseSchema,
  type StylistAdviceRequest,
  type StylistAdviceResponse,
} from '@/schemas/api/outfits';

export function getStylistAdvice(
  outfitId: string,
  payload?: StylistAdviceRequest,
  signal?: AbortSignal
): Promise<StylistAdviceResponse> {
  return apiRequest(
    {
      path: `/api/v1/outfits/${encodeURIComponent(outfitId)}/stylist-advice`,
      method: 'POST',
      body: (payload ?? {}) as Record<string, unknown>,
      timeoutMs: 25_000,
      signal,
    },
    StylistAdviceResponseSchema
  );
}
