'use client';

import { useQuery } from '@tanstack/react-query';
import { getMe } from '@/features/auth/api/getMe';

/**
 * Identidad del usuario demo en el backend (MVP sin JWT).
 *
 * La identidad es estable de por vida (`staleTime: Infinity`): pedirla más de una
 * vez por sesión es ruido. Todas las vistas que necesitan `user_id` (recomendador
 * de outfits, perfil) pasan por acá en vez de inventar un uuid.
 */
export function useMe() {
  return useQuery({
    queryKey: ['me'],
    queryFn: ({ signal }) => getMe(signal),
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });
}
