import { z } from 'zod';
import { apiRequest } from '@/lib/api/client';

// /health del backend: además de liveness expone qué proveedor VTON está activo
// (mock | http | replicate) — lo mostramos en el perfil para la demo.
export const HealthSchema = z.object({
  status: z.string(),
  vton_provider: z.string(),
});
export type Health = z.infer<typeof HealthSchema>;

export function getHealth(signal?: AbortSignal): Promise<Health> {
  return apiRequest({ path: '/health', method: 'GET', timeoutMs: 5_000, signal }, HealthSchema);
}
