import { z } from 'zod';

export const AestheticScoreSchema = z.object({
  aesthetic: z.string(), // TBD by backend — see note below
  confidence: z.number().min(0).max(1),
});
export type AestheticScore = z.infer<typeof AestheticScoreSchema>;

export const DominantColorSchema = z.object({
  h: z.number().min(0).max(360),
  s: z.number().min(0).max(100),
  v: z.number().min(0).max(100),
  hex: z.string().regex(/^#[0-9a-fA-F]{6}$/),
});
export type DominantColor = z.infer<typeof DominantColorSchema>;

// Posición para armado multicapa — alinea con OutfitPosition y soporta las 6 clases CLIP
export const GarmentPositionSchema = z.enum([
  'top',
  'bottom',
  'dress',
  'outerwear',
  'footwear',
  'bag',
]);
export type GarmentPosition = z.infer<typeof GarmentPositionSchema>;

// GAP: category is z.string() deliberately — plan-base.md gives examples but no closed enum.
// Replace with z.enum([...]) once backend publishes OpenAPI. See spec §2.3 note.
export const GarmentUploadResponseSchema = z.object({
  garment_id: z.string().uuid(),
  category: z.string(),
  subcategory: z.string().nullable().optional(),
  position: GarmentPositionSchema.optional(),
  top_aesthetics: z.array(AestheticScoreSchema).min(1).optional(),
  dominant_colors: z.array(DominantColorSchema).min(1),
  processed_image_url: z.string().url(),
  pattern: z.string().nullable().optional(),
});
export type GarmentUploadResponse = z.infer<typeof GarmentUploadResponseSchema>;

// GAP G1/G4 (api-contract-gaps/spec.md): the backend doesn't publish a listing or capsule
// endpoint yet. This is the placeholder shape wardrobe-flow/spec.md §6 already sanctions
// (`GarmentSummary`) and docs/context/backend-plan.md §6.2 proposes for the real endpoints —
// built against MSW mocks in tests; against a real backend it will 404/error until G1/G4 close,
// which the UI already renders as a typed ApiError/NetworkError state.
export const GarmentStatusSchema = z.enum(['AVAILABLE', 'LAUNDRY', 'REPAIR', 'INACTIVE']);
export type GarmentStatus = z.infer<typeof GarmentStatusSchema>;

export const GarmentSummarySchema = z.object({
  id: z.string().uuid(),
  processed_image_url: z.string().url(),
  category: z.string(),
  subcategory: z.string().nullable().optional(),
  dominant_aesthetic: z.string(),
  position: GarmentPositionSchema.optional(),
  status: GarmentStatusSchema.optional(),
  pattern: z.string().nullable().optional(),
});
export type GarmentSummary = z.infer<typeof GarmentSummarySchema>;

export const CapsuleCatalogResponseSchema = z.object({
  garments: z.array(GarmentSummarySchema),
});
export type CapsuleCatalogResponse = z.infer<typeof CapsuleCatalogResponseSchema>;

// GAP G1 (api-contract-gaps/spec.md): listado de prendas del usuario para /wardrobe
// (wardrobe-flow/spec.md §3.4). Mismo placeholder `GarmentSummary` que el catálogo cápsula,
// como su propio schema — cada gap se confirma de forma independiente contra el backend.
export const GarmentsListResponseSchema = z.object({
  garments: z.array(GarmentSummarySchema),
});
export type GarmentsListResponse = z.infer<typeof GarmentsListResponseSchema>;
