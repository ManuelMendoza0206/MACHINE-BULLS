'use client';

import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api/client';
import { GarmentsListResponseSchema, type GarmentsListResponse } from '@/schemas/api/garments';
import type { StyleMeError } from '@/lib/errors';

/**
 * GAP G1 (api-contract-gaps/spec.md): `GET /api/v1/garments` is documented but not confirmed
 * by the backend yet. Per wardrobe-flow/spec.md §6, no function for this endpoint lives in
 * `src/features/garments/api/` — that folder is reserved for contracts the backend has
 * confirmed, and this one hasn't been. The fetch call stays inline here, built and tested only
 * against the MSW mock in `tests/fixtures/msw/handlers.ts` until the gap closes.
 */
function listGarments(signal?: AbortSignal): Promise<GarmentsListResponse> {
  return apiRequest(
    { path: '/api/v1/garments', method: 'GET', timeoutMs: 10_000, signal },
    GarmentsListResponseSchema
  );
}

/** Reads the user's garment listing (wardrobe-flow/spec.md §3.4 — empty vs non-empty `/wardrobe`). */
export function useGarmentsList(): UseQueryResult<GarmentsListResponse, StyleMeError> {
  return useQuery({
    queryKey: ['garments-list'],
    queryFn: ({ signal }) => listGarments(signal),
  });
}
