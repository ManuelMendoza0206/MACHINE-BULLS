import { z } from 'zod';

// Closed enum — soporta las 6 categorias CLIP mapeadas a posicion de dominio
export const OutfitPositionSchema = z.enum([
  'top',
  'bottom',
  'dress',
  'footwear',
  'outerwear',
  'bag',
]);
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

export const PackingPlanRequestSchema = z.object({
  days: z.number().min(1).max(14).default(3),
  weather: z.enum(['cold', 'mild', 'warm']).default('mild'),
  occasion: z.string().optional(),
});
export type PackingPlanRequest = z.infer<typeof PackingPlanRequestSchema>;

export const PackedGarmentSummarySchema = z.object({
  id: z.string(),
  category: z.string(),
  position: z.string().nullable().optional(),
  processed_image_url: z.string(),
});
export type PackedGarmentSummary = z.infer<typeof PackedGarmentSummarySchema>;

export const DailyOutfitPlanSchema = z.object({
  day: z.number(),
  garment_ids: z.array(z.string()),
  reason: z.string(),
});
export type DailyOutfitPlan = z.infer<typeof DailyOutfitPlanSchema>;

export const PackingPlanResponseSchema = z.object({
  days: z.number(),
  weather: z.string(),
  packed_garments: z.array(PackedGarmentSummarySchema),
  daily_plans: z.array(DailyOutfitPlanSchema),
  total_items_count: z.number(),
  combinations_unlocked_count: z.number(),
  tip: z.string(),
});
export type PackingPlanResponse = z.infer<typeof PackingPlanResponseSchema>;

export const StylistAdviceRequestSchema = z.object({
  occasion: z.string().optional(),
  weather: z.string().optional(),
  user_note: z.string().max(300).optional(),
});
export type StylistAdviceRequest = z.infer<typeof StylistAdviceRequestSchema>;

export const StylistAdviceResponseSchema = z.object({
  outfit_id: z.string(),
  why_it_works: z.string(),
  accessories: z.array(z.string()).min(1),
  grooming_and_footwear: z.string(),
  event_adaptation: z.string(),
  source: z.enum(['azure_openai', 'rules']),
  model: z.string().nullable().optional(),
  cached: z.boolean().optional(),
});
export type StylistAdviceResponse = z.infer<typeof StylistAdviceResponseSchema>;
