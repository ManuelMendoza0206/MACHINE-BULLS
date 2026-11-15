import { apiRequest } from '@/lib/api/client';
import { z } from 'zod';

export const OutfitUsageLogSchema = z.object({
  id: z.string(),
  user_id: z.string(),
  outfit_id: z.string(),
  worn_date: z.string(),
  created_at: z.string(),
});

export type OutfitUsageLog = z.infer<typeof OutfitUsageLogSchema>;

export function wearOutfit(
  outfitId: string,
  wornDate?: string,
  signal?: AbortSignal
): Promise<OutfitUsageLog> {
  return apiRequest(
    {
      path: `/api/v1/outfits/${outfitId}/wear`,
      method: 'POST',
      body: wornDate ? { worn_date: wornDate } : {},
      timeoutMs: 5_000,
      signal,
    },
    OutfitUsageLogSchema
  );
}
