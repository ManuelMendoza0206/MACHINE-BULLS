import { apiRequest } from '@/lib/api/client';
import {
  WardrobeAnalyticsResponseSchema,
  type WardrobeAnalyticsResponse,
} from '@/schemas/api/shopping';

export function fetchWardrobeAnalytics(signal?: AbortSignal): Promise<WardrobeAnalyticsResponse> {
  return apiRequest(
    {
      path: '/api/v1/garments/analytics',
      method: 'GET',
      timeoutMs: 8_000,
      signal,
    },
    WardrobeAnalyticsResponseSchema
  );
}
