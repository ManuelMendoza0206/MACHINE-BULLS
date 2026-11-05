'use client';

import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { listVtonJobs } from '@/features/vton/api/listVtonJobs';
import type { VtonJobListResponse } from '@/schemas/api/vton';
import type { StyleMeError } from '@/lib/errors';

/**
 * Hook para consultar el historial de jobs VTON del usuario (vton-flow/spec.md §3.4).
 */
export function useVtonJobsHistory(limit = 50): UseQueryResult<VtonJobListResponse, StyleMeError> {
  return useQuery({
    queryKey: ['vton-jobs-history', limit],
    queryFn: ({ signal }) => listVtonJobs(limit, signal),
    staleTime: 10_000,
  });
}
