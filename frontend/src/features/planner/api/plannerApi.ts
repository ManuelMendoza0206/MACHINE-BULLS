import { z } from 'zod';
import { apiRequest } from '@/lib/api/client';
import {
  OutfitPlanConfirmResponse,
  OutfitPlanConfirmResponseSchema,
  OutfitPlanCreate,
  OutfitPlanResponse,
  OutfitPlanResponseSchema,
} from '@/schemas/api/outfits';

export function getOutfitPlans(
  params?: {
    startDate?: string;
    endDate?: string;
  },
  signal?: AbortSignal
): Promise<OutfitPlanResponse[]> {
  const searchParams = new URLSearchParams();
  if (params?.startDate) searchParams.set('start_date', params.startDate);
  if (params?.endDate) searchParams.set('end_date', params.endDate);

  const qs = searchParams.toString();
  const path = `/api/v1/planner${qs ? `?${qs}` : ''}`;

  return apiRequest(
    { path, method: 'GET', timeoutMs: 8_000, signal },
    z.array(OutfitPlanResponseSchema)
  );
}

export function createOutfitPlan(
  payload: OutfitPlanCreate,
  signal?: AbortSignal
): Promise<OutfitPlanResponse> {
  return apiRequest(
    {
      path: '/api/v1/planner',
      method: 'POST',
      body: payload as unknown as Record<string, unknown>,
      timeoutMs: 8_000,
      signal,
    },
    OutfitPlanResponseSchema
  );
}

export function confirmOutfitPlan(
  planId: string,
  sendToLaundry: boolean = true,
  signal?: AbortSignal
): Promise<OutfitPlanConfirmResponse> {
  return apiRequest(
    {
      path: `/api/v1/planner/${encodeURIComponent(planId)}/confirm?send_to_laundry=${sendToLaundry}`,
      method: 'PATCH',
      timeoutMs: 8_000,
      signal,
    },
    OutfitPlanConfirmResponseSchema
  );
}

export async function deleteOutfitPlan(planId: string, signal?: AbortSignal): Promise<void> {
  await apiRequest(
    {
      path: `/api/v1/planner/${encodeURIComponent(planId)}`,
      method: 'DELETE',
      timeoutMs: 8_000,
      signal,
    },
    z.object({ deleted: z.boolean() }).passthrough()
  );
}
