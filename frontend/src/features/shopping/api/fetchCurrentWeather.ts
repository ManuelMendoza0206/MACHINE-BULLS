import { apiRequest } from '@/lib/api/client';
import { ApiError, NetworkError, ValidationError } from '@/lib/errors';
import { WeatherResponseSchema, type WeatherResponse } from '@/schemas/api/shopping';

export interface WeatherQueryParams {
  city?: string;
  lat?: number;
  lon?: number;
}

export async function fetchCurrentWeather(
  cityOrParams: string | WeatherQueryParams = 'La Paz',
  signal?: AbortSignal
): Promise<WeatherResponse> {
  const fallbackCity =
    typeof cityOrParams === 'string' ? cityOrParams : (cityOrParams.city ?? 'La Paz');
  const qs =
    typeof cityOrParams === 'string'
      ? `city=${encodeURIComponent(cityOrParams)}`
      : cityOrParams.lat !== undefined && cityOrParams.lon !== undefined
        ? `lat=${encodeURIComponent(String(cityOrParams.lat))}&lon=${encodeURIComponent(String(cityOrParams.lon))}`
        : `city=${encodeURIComponent(cityOrParams.city ?? 'La Paz')}`;

  try {
    return await apiRequest(
      {
        path: `/api/v1/shopping/weather?${qs}`,
        method: 'GET',
        timeoutMs: 8_000,
        signal,
      },
      WeatherResponseSchema
    );
  } catch (error) {
    if (
      signal?.aborted ||
      error instanceof ValidationError ||
      (error instanceof ApiError && error.status < 500) ||
      (!(error instanceof NetworkError) && !(error instanceof ApiError))
    ) {
      throw error;
    }

    return {
      city: fallbackCity || 'La Paz',
      temp_c: 15,
      condition: 'Estimación temporal',
      weather_type: 'mild',
      is_raining: false,
      source: 'fallback',
    };
  }
}
