import { z } from 'zod';
import { GarmentUploadResponseSchema } from './garments';
import { OutfitSchema } from './outfits';

export const SmartShoppingRedundancySchema = z.object({
  is_redundant: z.boolean(),
  similar_garment_id: z.string().nullable().optional(),
  similarity: z.number(),
  message: z.string().nullable().optional(),
});
export type SmartShoppingRedundancy = z.infer<typeof SmartShoppingRedundancySchema>;

export const SmartShoppingEvaluateResponseSchema = z.object({
  candidate_garment: GarmentUploadResponseSchema,
  compatible_garments_count: z.number(),
  potential_outfits_count: z.number(),
  redundancy: SmartShoppingRedundancySchema,
  verdict: z.string(),
  potential_outfits: z.array(OutfitSchema),
});
export type SmartShoppingEvaluateResponse = z.infer<typeof SmartShoppingEvaluateResponseSchema>;

export const WeatherResponseSchema = z.object({
  city: z.string(),
  temp_c: z.number(),
  condition: z.string(),
  weather_type: z.enum(['cold', 'mild', 'warm']).or(z.string()),
  is_raining: z.boolean(),
  source: z.string(),
});
export type WeatherResponse = z.infer<typeof WeatherResponseSchema>;

export const WardrobeAnalyticsItemSchema = z.object({
  id: z.string(),
  category: z.string(),
  position: z.string(),
  image_url: z.string(),
  wear_count: z.number(),
});
export type WardrobeAnalyticsItem = z.infer<typeof WardrobeAnalyticsItemSchema>;

export const WardrobeAnalyticsResponseSchema = z.object({
  total_garments: z.number(),
  utilization_rate: z.number(),
  most_worn_garments: z.array(WardrobeAnalyticsItemSchema),
  unworn_garments: z.array(WardrobeAnalyticsItemSchema),
  wardrobe_gaps: z.array(z.string()),
});
export type WardrobeAnalyticsResponse = z.infer<typeof WardrobeAnalyticsResponseSchema>;
