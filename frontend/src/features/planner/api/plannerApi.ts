import {
  OutfitPlanConfirmResponse,
  OutfitPlanConfirmResponseSchema,
  OutfitPlanCreate,
  OutfitPlanResponse,
  OutfitPlanResponseSchema,
} from '@/schemas/api/outfits';
import { z } from 'zod';

export async function getOutfitPlans(params?: {
  startDate?: string;
  endDate?: string;
}): Promise<OutfitPlanResponse[]> {
  const searchParams = new URLSearchParams();
  if (params?.startDate) searchParams.set('start_date', params.startDate);
  if (params?.endDate) searchParams.set('end_date', params.endDate);

  const qs = searchParams.toString();
  const url = `/api/v1/planner${qs ? `?${qs}` : ''}`;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error('No pudimos cargar los planes de vestimenta.');
  }

  const data = await res.json();
  return z.array(OutfitPlanResponseSchema).parse(data);
}

export async function createOutfitPlan(payload: OutfitPlanCreate): Promise<OutfitPlanResponse> {
  const res = await fetch('/api/v1/planner', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || 'No pudimos agendar el conjunto.');
  }

  const data = await res.json();
  return OutfitPlanResponseSchema.parse(data);
}

export async function confirmOutfitPlan(
  planId: string,
  sendToLaundry: boolean = true
): Promise<OutfitPlanConfirmResponse> {
  const res = await fetch(`/api/v1/planner/${planId}/confirm?send_to_laundry=${sendToLaundry}`, {
    method: 'PATCH',
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || 'No se pudo confirmar el uso del conjunto.');
  }

  const data = await res.json();
  return OutfitPlanConfirmResponseSchema.parse(data);
}

export async function deleteOutfitPlan(planId: string): Promise<void> {
  const res = await fetch(`/api/v1/planner/${planId}`, {
    method: 'DELETE',
  });

  if (!res.ok) {
    throw new Error('No se pudo cancelar el plan.');
  }
}
