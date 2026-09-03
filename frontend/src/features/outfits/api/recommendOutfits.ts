import { apiRequest } from '@/lib/api/client';
import {
  OutfitRecommendationResponseSchema,
  OutfitRecommendRequestSchema,
  type OutfitRecommendationResponse,
  type OutfitRecommendRequest,
} from '@/schemas/api/outfits';

export function recommendOutfits(
  req: OutfitRecommendRequest,
  signal?: AbortSignal
): Promise<OutfitRecommendationResponse> {
  const parsed = OutfitRecommendRequestSchema.parse(req);
  return apiRequest(
    {
      path: '/api/v1/outfits/recommend',
      method: 'POST',
      body: parsed as unknown as Record<string, unknown>,
      timeoutMs: 10_000,
      signal,
    },
    OutfitRecommendationResponseSchema
  );
}
