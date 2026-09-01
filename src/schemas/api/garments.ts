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

// GAP: category is z.string() deliberately — plan-base.md gives examples but no closed enum.
// Replace with z.enum([...]) once backend publishes OpenAPI. See spec §2.3 note.
export const GarmentUploadResponseSchema = z.object({
  garment_id: z.string().uuid(),
  category: z.string(),
  top_aesthetics: z.array(AestheticScoreSchema).min(1),
  dominant_colors: z.array(DominantColorSchema).min(1),
  processed_image_url: z.string().url(),
});
export type GarmentUploadResponse = z.infer<typeof GarmentUploadResponseSchema>;
