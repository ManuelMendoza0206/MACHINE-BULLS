import { apiRequest } from '@/lib/api/client';
import { OutfitSchema, type Outfit } from '@/schemas/api/outfits';

export function getOutfit(outfitId: string, signal?: AbortSignal): Promise<Outfit> {
  return apiRequest(
    {
      path: `/api/v1/outfits/${encodeURIComponent(outfitId)}`,
      method: 'GET',
      timeoutMs: 5_000,
      signal,
    },
    OutfitSchema
  );
}
