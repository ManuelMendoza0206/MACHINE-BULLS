import { apiRequest } from '@/lib/api/client';
import {
  OutfitPlanConfirmResponseSchema,
  OutfitPlanCreate,
  OutfitPlanResponseSchema,
} from '@/schemas/api/outfits';
import { z } from 'zod';

const PlanListSchema = z.array(OutfitPlanResponseSchema);
const DeletePlanSchema = z.object({ deleted: z.boolean(), id: z.string() });

export async function getOutfitPlans(params?: {
  startDate?: string;
  endDate?: string;
}): Promise<z.infer<typeof PlanListSchema>> {
  const searchParams = new URLSearchParams();
  if (params?.startDate) searchParams.set('start_date', params.startDate);
  if (params?.endDate) searchParams.set('end_date', params.endDate);
  const query = searchParams.toString();
  return apiRequest(
    {
      path: `/api/v1/planner${query ? `?${query}` : ''}`,
      method: 'GET',
      timeoutMs: 10_000,
    },
    PlanListSchema
  );
}

export function createOutfitPlan(payload: OutfitPlanCreate) {
  return apiRequest(
    {
      path: '/api/v1/planner',
      method: 'POST',
      body: payload as unknown as Record<string, unknown>,
      timeoutMs: 10_000,
    },
    OutfitPlanResponseSchema
  );
}

export function confirmOutfitPlan(planId: string, sendToLaundry = true) {
  return apiRequest(
    {
      path: `/api/v1/planner/${encodeURIComponent(planId)}/confirm?send_to_laundry=${sendToLaundry}`,
      method: 'PATCH',
      timeoutMs: 10_000,
    },
    OutfitPlanConfirmResponseSchema
  );
}

export async function deleteOutfitPlan(planId: string): Promise<void> {
  await apiRequest(
    { path: `/api/v1/planner/${encodeURIComponent(planId)}`, method: 'DELETE', timeoutMs: 10_000 },
    DeletePlanSchema
  );
}
