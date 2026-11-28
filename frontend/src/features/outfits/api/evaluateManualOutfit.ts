import { apiRequest } from '@/lib/api/client';
import { OutfitSchema, type Outfit } from '@/schemas/api/outfits';

export interface ManualOutfitEvaluateInput {
  garment_ids: string[];
  occasion?: string;
  weather?: string;
}

export function evaluateManualOutfit(
  payload: ManualOutfitEvaluateInput,
  signal?: AbortSignal
): Promise<Outfit> {
  return apiRequest(
    {
      path: '/api/v1/outfits/evaluate-manual',
      method: 'POST',
      body: payload as unknown as Record<string, unknown>,
      timeoutMs: 10_000,
      signal,
    },
    OutfitSchema
  );
}
