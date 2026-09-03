import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { z } from 'zod';
import { apiRequest } from '@/lib/api/client';
import { ApiError, NetworkError, ValidationError } from '@/lib/errors';

const TestSchema = z.object({ ok: z.boolean(), value: z.string() });
type TestType = z.infer<typeof TestSchema>;

const originalEnv = process.env['NEXT_PUBLIC_API_BASE_URL'];

beforeEach(() => {
  process.env['NEXT_PUBLIC_API_BASE_URL'] = 'https://api.example.com';
  vi.restoreAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
  if (originalEnv === undefined) {
    delete process.env['NEXT_PUBLIC_API_BASE_URL'];
  } else {
    process.env['NEXT_PUBLIC_API_BASE_URL'] = originalEnv;
  }
});

function mockFetchOnce(response: unknown): ReturnType<typeof vi.fn> {
  const fetchMock = vi.fn().mockResolvedValue(response as Response);
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

describe('apiRequest', () => {
  it('resolves with validated data on 200 valid', async () => {
    mockFetchOnce({
      ok: true,
      status: 200,
      json: async () => ({ ok: true, value: 'hello' }),
    });

    const data = await apiRequest<TestType>(
      { path: '/api/v1/test', method: 'GET', timeoutMs: 1000 },
      TestSchema
    );
    expect(data).toEqual({ ok: true, value: 'hello' });
  });

  it('throws ValidationError on 200 invalid payload', async () => {
    mockFetchOnce({
      ok: true,
      status: 200,
      json: async () => ({ ok: true }),
    });

    await expect(
      apiRequest({ path: '/api/v1/test', method: 'GET', timeoutMs: 1000 }, TestSchema)
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it('throws ApiError on 404/500 with status', async () => {
    mockFetchOnce({
      ok: false,
      status: 404,
      text: async () => JSON.stringify({ detail: 'not found' }),
    });

    await expect(
      apiRequest({ path: '/api/v1/test', method: 'GET', timeoutMs: 1000 }, TestSchema)
    ).rejects.toMatchObject({ code: 'API_ERROR', status: 404 } as unknown as ApiError);

    mockFetchOnce({
      ok: false,
      status: 500,
      text: async () => 'internal error',
    });

    const err = (await apiRequest(
      { path: '/api/v1/test', method: 'GET', timeoutMs: 1000 },
      TestSchema
    ).catch((e: unknown) => e as ApiError)) as ApiError;
    expect(err).toBeInstanceOf(ApiError);
    expect(err.status).toBe(500);
  });

  it('throws NetworkError when fetch rejects', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));

    await expect(
      apiRequest({ path: '/api/v1/test', method: 'GET', timeoutMs: 1000 }, TestSchema)
    ).rejects.toBeInstanceOf(NetworkError);
  });

  it('throws NetworkError on timeout', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((_url: string, opts: RequestInit) => {
        return new Promise((_resolve, reject) => {
          opts.signal?.addEventListener('abort', () => {
            reject(new DOMException('The operation was aborted', 'AbortError'));
          });
        });
      })
    );

    await expect(
      apiRequest({ path: '/api/v1/test', method: 'GET', timeoutMs: 15 }, TestSchema)
    ).rejects.toMatchObject({ code: 'NETWORK_ERROR' } as unknown as NetworkError);
  });

  it('does not set Content-Type for FormData', async () => {
    const fetchMock = mockFetchOnce({
      ok: true,
      status: 200,
      json: async () => ({ ok: true, value: 'x' }),
    });

    const fd = new FormData();
    fd.append('file', new Blob(['hi']), 'hi.txt');

    await apiRequest(
      { path: '/api/v1/garments/upload', method: 'POST', body: fd, timeoutMs: 1000 },
      TestSchema
    );

    const [, opts] = fetchMock.mock.calls[0] as [string, RequestInit];
    const headers = opts.headers as Record<string, string> | undefined;
    expect(headers?.['Content-Type']).toBeUndefined();
  });

  it('respects external AbortSignal', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((_url: string, opts: RequestInit) => {
        return new Promise((_resolve, reject) => {
          opts.signal?.addEventListener('abort', () => {
            reject(new DOMException('The operation was aborted', 'AbortError'));
          });
        });
      })
    );

    const external = new AbortController();
    const promise = apiRequest(
      { path: '/api/v1/test', method: 'GET', timeoutMs: 5000, signal: external.signal },
      TestSchema
    );
    external.abort();

    await expect(promise).rejects.toBeInstanceOf(NetworkError);
  });

  it('throws at startup if NEXT_PUBLIC_API_BASE_URL missing', async () => {
    delete process.env['NEXT_PUBLIC_API_BASE_URL'];
    mockFetchOnce({ ok: true, status: 200, json: async () => ({ ok: true, value: 'x' }) });

    await expect(
      apiRequest({ path: '/api/v1/test', method: 'GET', timeoutMs: 1000 }, TestSchema)
    ).rejects.toThrow(/NEXT_PUBLIC_API_BASE_URL/);
  });

  it('serializes JSON body with Content-Type', async () => {
    const fetchMock = mockFetchOnce({
      ok: true,
      status: 200,
      json: async () => ({ ok: true, value: 'json-body' }),
    });

    await apiRequest(
      { path: '/api/v1/test', method: 'POST', body: { foo: 'bar' }, timeoutMs: 1000 },
      TestSchema
    );

    const [, opts] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect((opts.headers as Record<string, string>)['Content-Type']).toBe('application/json');
    expect(opts.body).toBe(JSON.stringify({ foo: 'bar' }));
  });

  it('handles already-aborted external signal', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((_url: string, opts: RequestInit) => {
        return new Promise((_resolve, reject) => {
          opts.signal?.addEventListener('abort', () => {
            const err = new Error('The operation was aborted');
            err.name = 'AbortError';
            reject(err);
          });
          // already aborted -> fetch should reject immediately via signal
          if (opts.signal?.aborted) {
            const err = new Error('The operation was aborted');
            err.name = 'AbortError';
            reject(err);
          }
        });
      })
    );

    const external = new AbortController();
    external.abort();

    await expect(
      apiRequest(
        { path: '/api/v1/test', method: 'GET', timeoutMs: 5000, signal: external.signal },
        TestSchema
      )
    ).rejects.toBeInstanceOf(NetworkError);
  });

  it('maps non-DOMException AbortError to NetworkError', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(Object.assign(new Error('aborted'), { name: 'AbortError' }))
    );

    await expect(
      apiRequest({ path: '/api/v1/test', method: 'GET', timeoutMs: 1000 }, TestSchema)
    ).rejects.toBeInstanceOf(NetworkError);
  });
});
