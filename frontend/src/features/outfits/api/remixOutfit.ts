import {
  OutfitRecommendationResponse,
  OutfitRecommendationResponseSchema,
  OutfitRemixRequest,
} from '@/schemas/api/outfits';

export async function remixOutfit(
  payload: OutfitRemixRequest
): Promise<OutfitRecommendationResponse> {
  const res = await fetch('/api/v1/outfits/remix', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || 'No pudimos generar combinaciones alternativas.');
  }

  const data = await res.json();
  return OutfitRecommendationResponseSchema.parse(data);
}
