import { apiRequest } from '@/lib/api/client';
import { ApiError, NetworkError, ValidationError } from '@/lib/errors';
import { WeatherResponseSchema, type WeatherResponse } from '@/schemas/api/shopping';

export async function fetchCurrentWeather(
  city: string = 'La Paz',
  signal?: AbortSignal
): Promise<WeatherResponse> {
  try {
    return await apiRequest(
      {
        path: `/api/v1/shopping/weather?city=${encodeURIComponent(city)}`,
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
      city: city || 'La Paz',
      temp_c: 15,
      condition: 'Estimación temporal',
      weather_type: 'mild',
      is_raining: false,
      source: 'fallback',
    };
  }
}
