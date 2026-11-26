import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiRequest } from '@/lib/api/client';
import { ApiError, NetworkError } from '@/lib/errors';
import { fetchCurrentWeather } from '@/features/shopping/api/fetchCurrentWeather';

vi.mock('@/lib/api/client', () => ({ apiRequest: vi.fn() }));

const mockedRequest = vi.mocked(apiRequest);

describe('fetchCurrentWeather', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns an explicit estimate on network failure and keeps the request timeout', async () => {
    mockedRequest.mockRejectedValue(new NetworkError('Request timeout after 8000ms'));

    await expect(fetchCurrentWeather('Oruro')).resolves.toEqual({
      city: 'Oruro',
      temp_c: 15,
      condition: 'Estimación temporal',
      weather_type: 'mild',
      is_raining: false,
      source: 'fallback',
    });
    expect(mockedRequest.mock.calls[0]?.[0]).toMatchObject({
      path: '/api/v1/shopping/weather?city=Oruro',
      timeoutMs: 8_000,
    });
  });

  it('does not turn an aborted query into a weather estimate', async () => {
    const controller = new AbortController();
    controller.abort();
    mockedRequest.mockRejectedValue(new NetworkError('Request aborted'));

    await expect(fetchCurrentWeather('La Paz', controller.signal)).rejects.toThrow(
      'Request aborted'
    );
  });

  it('does not hide authentication failures behind an estimate', async () => {
    mockedRequest.mockRejectedValue(new ApiError('Unauthorized', 401));

    await expect(fetchCurrentWeather()).rejects.toThrow('Unauthorized');
  });
});
