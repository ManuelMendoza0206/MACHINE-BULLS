import { GarmentSummary, GarmentSummarySchema } from '@/schemas/api/garments';

export async function updateGarmentStatus(
  garmentId: string,
  status: 'AVAILABLE' | 'LAUNDRY' | 'REPAIR' | 'INACTIVE'
): Promise<GarmentSummary> {
  const res = await fetch(`/api/v1/garments/${garmentId}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || 'No se pudo actualizar el estado de la prenda.');
  }

  const data = await res.json();
  return GarmentSummarySchema.parse(data);
}
