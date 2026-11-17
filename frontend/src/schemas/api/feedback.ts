import { z } from 'zod';

export const OutfitFeedbackOutSchema = z.object({
  id: z.string(),
  user_id: z.string(),
  outfit_id: z.string(),
  rating: z.number(),
  feedback_type: z.string().nullable().optional(),
  created_at: z.string(),
});

export type OutfitFeedbackOut = z.infer<typeof OutfitFeedbackOutSchema>;
