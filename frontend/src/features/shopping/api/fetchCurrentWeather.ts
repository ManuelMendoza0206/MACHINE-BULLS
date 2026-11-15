import { apiRequest } from '@/lib/api/client';
import { WeatherResponseSchema, type WeatherResponse } from '@/schemas/api/shopping';

export function fetchCurrentWeather(
  city: string = 'La Paz',
  signal?: AbortSignal
): Promise<WeatherResponse> {
  return apiRequest(
    {
      path: `/api/v1/shopping/weather?city=${encodeURIComponent(city)}`,
      method: 'GET',
      timeoutMs: 8_000,
      signal,
    },
    WeatherResponseSchema
  );
}
