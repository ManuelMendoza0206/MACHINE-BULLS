import { z } from 'zod';

// Identidad derivada por backend desde JWT o demo explícitamente habilitado en desarrollo.
export const MeResponseSchema = z.object({
  user_id: z.string().uuid(),
  email: z.string().email(),
});
export type MeResponse = z.infer<typeof MeResponseSchema>;

// Foto canonica persistente con consentimiento informado (retencion explicita).
export const CanonicalPhotoResponseSchema = z.object({
  has_canonical: z.boolean(),
  photo_url: z.string().url().nullable().optional(),
  consent_at: z.string().nullable().optional(),
  message: z.string().nullable().optional(),
});
export type CanonicalPhotoResponse = z.infer<typeof CanonicalPhotoResponseSchema>;
