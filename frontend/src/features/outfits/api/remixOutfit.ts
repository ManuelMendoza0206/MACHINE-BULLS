import { apiRequest } from '@/lib/api/client';
import {
  OutfitRecommendationResponse,
  OutfitRecommendationResponseSchema,
  OutfitRemixRequest,
} from '@/schemas/api/outfits';

export function remixOutfit(
  payload: OutfitRemixRequest,
  signal?: AbortSignal
): Promise<OutfitRecommendationResponse> {
  return apiRequest(
    {
      path: '/api/v1/outfits/remix',
      method: 'POST',
      body: payload as unknown as Record<string, unknown>,
      timeoutMs: 10_000,
      signal,
    },
    OutfitRecommendationResponseSchema
  );
}
