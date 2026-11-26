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
  occasion: z.string().nullable().optional(),
  weather: z.string().nullable().optional(),
  reason: z.string().nullable().optional(),
});
export type Outfit = z.infer<typeof OutfitSchema>;

export const OutfitRecommendationResponseSchema = z.object({
  outfits: z.array(OutfitSchema),
});
export type OutfitRecommendationResponse = z.infer<typeof OutfitRecommendationResponseSchema>;

export const OutfitRecommendRequestSchema = z.object({
  user_id: z.string().uuid().optional(),
  target_aesthetic: z.string().optional(),
  available_garment_ids: z.array(z.string().uuid()).optional(),
  occasion: z.string().optional(),
  weather: z.string().optional(),
});
export type OutfitRecommendRequest = z.infer<typeof OutfitRecommendRequestSchema>;

export const OutfitRemixRequestSchema = z.object({
  user_id: z.string().optional(),
  pinned_garment_ids: z.array(z.string()).min(1),
  occasion: z.string().optional(),
  weather: z.string().optional(),
  target_aesthetic: z.string().optional(),
});
export type OutfitRemixRequest = z.infer<typeof OutfitRemixRequestSchema>;

export const OutfitPlanStatusSchema = z.enum(['PLANNED', 'COMPLETED', 'CANCELLED']);
export type OutfitPlanStatus = z.infer<typeof OutfitPlanStatusSchema>;

export const OutfitPlanCreateSchema = z.object({
  user_id: z.string().optional(),
  planned_date: z.string(),
  garment_ids: z.array(z.string()).min(1),
  outfit_id: z.string().nullable().optional(),
  occasion: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});
export type OutfitPlanCreate = z.infer<typeof OutfitPlanCreateSchema>;

export const OutfitPlanResponseSchema = z.object({
  id: z.string(),
  user_id: z.string(),
  planned_date: z.string(),
  garment_ids: z.array(z.string()),
  outfit_id: z.string().nullable().optional(),
  occasion: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  status: OutfitPlanStatusSchema,
  created_at: z.string(),
  updated_at: z.string(),
});
export type OutfitPlanResponse = z.infer<typeof OutfitPlanResponseSchema>;

export const OutfitPlanConfirmResponseSchema = z.object({
  plan: OutfitPlanResponseSchema,
  usage_logged: z.boolean(),
  garments_marked_laundry: z.array(z.string()),
});
export type OutfitPlanConfirmResponse = z.infer<typeof OutfitPlanConfirmResponseSchema>;
