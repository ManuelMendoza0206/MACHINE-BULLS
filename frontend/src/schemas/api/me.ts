import { z } from 'zod';

// Identidad del MVP: el backend no valida JWT, así que /me expone el user_id
// bajo el que persiste prendas y outfits (coincide con domain/schemas.py::MeResponse).
export const MeResponseSchema = z.object({
  user_id: z.string().uuid(),
  email: z.string().email(),
});
export type MeResponse = z.infer<typeof MeResponseSchema>;
