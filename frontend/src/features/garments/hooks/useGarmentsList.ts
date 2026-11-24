'use client';

import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { listGarments } from '@/features/garments/api/listGarments';
import type { GarmentsListResponse } from '@/schemas/api/garments';
import type { StyleMeError } from '@/lib/errors';

/** Reads the user's garment listing (wardrobe-flow/spec.md §3.4 — empty vs non-empty `/wardrobe`). */
export function useGarmentsList(): UseQueryResult<GarmentsListResponse, StyleMeError> {
  return useQuery({
    queryKey: ['garments-list'],
    queryFn: ({ signal }) => listGarments(signal),
  });
}
