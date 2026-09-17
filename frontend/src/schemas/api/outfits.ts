import { z } from 'zod';

// Closed enum — explicit in plan-base.md §10.1
export const OutfitPositionSchema = z.enum(['top', 'bottom', 'footwear', 'outerwear']);
export type OutfitPosition = z.infer<typeof OutfitPositionSchema>;

export const OutfitGarmentRefSchema = z.object({
  garment_id: z.string().uuid(),
  position: OutfitPositionSchema,
});
export type OutfitGarmentRef = z.infer<typeof OutfitGarmentRefSchema>;

export const OutfitSchema = z.object({
  outfit_id: z.string().uuid(),
  // GAP: aesthetic is z.string() — no closed enum published yet
  aesthetic: z.string(),
  garments: z.array(OutfitGarmentRefSchema).min(1),
  chromatic_score: z.number().min(0).max(1),
  embedding_score: z.number().min(0).max(1),
});
export type Outfit = z.infer<typeof OutfitSchema>;

export const OutfitRecommendationResponseSchema = z.object({
  outfits: z.array(OutfitSchema),
});
export type OutfitRecommendationResponse = z.infer<typeof OutfitRecommendationResponseSchema>;

export const OutfitRecommendRequestSchema = z.object({
  user_id: z.string().uuid(),
  target_aesthetic: z.string().optional(),
  available_garment_ids: z.array(z.string().uuid()).optional(),
});
export type OutfitRecommendRequest = z.infer<typeof OutfitRecommendRequestSchema>;
