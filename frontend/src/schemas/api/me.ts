import { z } from 'zod';

// Identidad derivada por backend desde JWT o demo explícitamente habilitado en desarrollo.
export const MeResponseSchema = z.object({
  user_id: z.string().uuid(),
  email: z.string().email(),
});
export type MeResponse = z.infer<typeof MeResponseSchema>;
