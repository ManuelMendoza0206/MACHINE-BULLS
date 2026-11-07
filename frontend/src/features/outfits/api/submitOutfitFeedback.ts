import { apiRequest } from '@/lib/api/client';
import { OutfitFeedbackOutSchema, type OutfitFeedbackOut } from '@/schemas/api/feedback';

export interface SubmitFeedbackPayload {
  rating: number;
  feedback_type?: 'like' | 'dislike';
  notes?: string;
}

export function submitOutfitFeedback(
  outfitId: string,
  payload: SubmitFeedbackPayload,
  signal?: AbortSignal
): Promise<OutfitFeedbackOut> {
  return apiRequest(
    {
      path: `/api/v1/outfits/${encodeURIComponent(outfitId)}/feedback`,
      method: 'POST',
      body: payload as unknown as Record<string, unknown>,
      timeoutMs: 5_000,
      signal,
    },
    OutfitFeedbackOutSchema
  );
}
