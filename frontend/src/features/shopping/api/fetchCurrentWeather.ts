import { apiRequest } from '@/lib/api/client';
import { WeatherResponseSchema, type WeatherResponse } from '@/schemas/api/shopping';

export interface WeatherQueryParams {
  city?: string;
  lat?: number;
  lon?: number;
}

export function fetchCurrentWeather(
  cityOrParams: string | WeatherQueryParams = 'La Paz',
  signal?: AbortSignal
): Promise<WeatherResponse> {
  const qs =
    typeof cityOrParams === 'string'
      ? `city=${encodeURIComponent(cityOrParams)}`
      : cityOrParams.lat !== undefined && cityOrParams.lon !== undefined
        ? `lat=${encodeURIComponent(String(cityOrParams.lat))}&lon=${encodeURIComponent(String(cityOrParams.lon))}`
        : `city=${encodeURIComponent(cityOrParams.city ?? 'La Paz')}`;

  return apiRequest(
    {
      path: `/api/v1/shopping/weather?${qs}`,
      method: 'GET',
      timeoutMs: 8_000,
      signal,
    },
    WeatherResponseSchema
  );
}
