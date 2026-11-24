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

// E2-T10 — respuestas que violan el contrato: cuerpos que no parsean, 4xx/5xx sin
// body o con shape inesperado, y mensajes tipados para timeout vs. abort externo.
describe('apiRequest — respuestas horrendas', () => {
  it('rechaza un cuerpo que no parsea como JSON con NetworkError tipado', async () => {
    mockFetchOnce({
      ok: true,
      status: 200,
      json: async () => {
        throw new SyntaxError('Unexpected token < in JSON at position 0');
      },
    });

    const err = (await apiRequest(
      { path: '/api/v1/test', method: 'GET', timeoutMs: 1000 },
      TestSchema
    ).catch((e: unknown) => e)) as Error;

    // Un body roto NO se cuela como data validada ni crashea: sale tipado.
    expect(err).toBeInstanceOf(NetworkError);
    expect(err).toMatchObject({ code: 'NETWORK_ERROR' });
  });

  it('4xx sin body: ApiError con status y responseBody undefined', async () => {
    mockFetchOnce({ ok: false, status: 502, text: async () => '' });

    const err = (await apiRequest(
      { path: '/api/v1/test', method: 'GET', timeoutMs: 1000 },
      TestSchema
    ).catch((e: unknown) => e)) as ApiError;

    expect(err).toBeInstanceOf(ApiError);
    expect(err.status).toBe(502);
    expect(err.responseBody).toBeUndefined();
    expect(err.message).toBe('Request failed with status 502');
  });

  it('4xx con body HTML (no-JSON) conserva el status sin romper el manejo de errores', async () => {
    mockFetchOnce({
      ok: false,
      status: 403,
      text: async () => '<html><body>Proxy error</body></html>',
    });

    const err = (await apiRequest(
      { path: '/api/v1/test', method: 'GET', timeoutMs: 1000 },
      TestSchema
    ).catch((e: unknown) => e)) as ApiError;

    expect(err).toBeInstanceOf(ApiError);
    expect(err.status).toBe(403);
    expect(err.responseBody).toBeUndefined();
  });

  it('5xx con un body de shape inesperado (array) se conserva para diagnóstico', async () => {
    mockFetchOnce({ ok: false, status: 500, text: async () => '["sin","forma"]' });

    const err = (await apiRequest(
      { path: '/api/v1/test', method: 'GET', timeoutMs: 1000 },
      TestSchema
    ).catch((e: unknown) => e)) as ApiError;

    expect(err).toBeInstanceOf(ApiError);
    expect(err.responseBody).toEqual(['sin', 'forma']);
  });

  it('422 conserva el detalle del body en ApiError.responseBody (lo consume mapStatusToUserMessage)', async () => {
    mockFetchOnce({
      ok: false,
      status: 422,
      text: async () => JSON.stringify({ detail: 'Imagen rechazada por el motor' }),
    });

    const err = (await apiRequest(
      { path: '/api/v1/test', method: 'POST', body: { foo: 1 }, timeoutMs: 1000 },
      TestSchema
    ).catch((e: unknown) => e)) as ApiError;

    expect(err).toBeInstanceOf(ApiError);
    expect(err.status).toBe(422);
    expect(err.responseBody).toMatchObject({ detail: 'Imagen rechazada por el motor' });
  });

  it('ValidationError expone los issues de Zod con path y mensaje', async () => {
    mockFetchOnce({ ok: true, status: 200, json: async () => ({ ok: true, value: 42 }) });

    const err = (await apiRequest(
      { path: '/api/v1/test', method: 'GET', timeoutMs: 1000 },
      TestSchema
    ).catch((e: unknown) => e)) as ValidationError;

    expect(err).toBeInstanceOf(ValidationError);
    expect(err.code).toBe('VALIDATION_ERROR');
    expect(err.issues.length).toBeGreaterThan(0);
    expect(err.issues[0]?.path).toEqual(['value']);
  });

  it('el mensaje de timeout indica los ms esperados', async () => {
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

    const err = (await apiRequest(
      { path: '/api/v1/test', method: 'GET', timeoutMs: 1234 },
      TestSchema
    ).catch((e: unknown) => e)) as NetworkError;

    expect(err).toBeInstanceOf(NetworkError);
    expect(err.message).toBe('Request timeout after 1234ms');
  });

  it('el mensaje de abort externo es distinguible del timeout', async () => {
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
      { path: '/api/v1/test', method: 'GET', timeoutMs: 99_999, signal: external.signal },
      TestSchema
    );
    external.abort();

    const err = (await promise.catch((e: unknown) => e)) as NetworkError;
    expect(err).toBeInstanceOf(NetworkError);
    expect(err.message).toBe('Request aborted');
  });

  it('conserva el mensaje original del fetch en NetworkError (diagnóstico offline)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('fetch failed')));

    const err = (await apiRequest(
      { path: '/api/v1/test', method: 'GET', timeoutMs: 1000 },
      TestSchema
    ).catch((e: unknown) => e)) as NetworkError;

    expect(err).toBeInstanceOf(NetworkError);
    expect(err.message).toBe('fetch failed');
    expect(err.cause).toBeInstanceOf(TypeError);
  });

  it('si la señal externa ya está abortada, fetch ni siquiera llega a resolverse', async () => {
    const fetchMock = vi.fn().mockImplementation((_url: string, opts: RequestInit) => {
      return new Promise((_resolve, reject) => {
        if (opts.signal?.aborted) {
          reject(new DOMException('The operation was aborted', 'AbortError'));
          return;
        }
        opts.signal?.addEventListener('abort', () => {
          reject(new DOMException('The operation was aborted', 'AbortError'));
        });
      });
    });
    vi.stubGlobal('fetch', fetchMock);

    const external = new AbortController();
    external.abort();

    await expect(
      apiRequest(
        { path: '/api/v1/test', method: 'GET', timeoutMs: 99_999, signal: external.signal },
        TestSchema
      )
    ).rejects.toBeInstanceOf(NetworkError);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, opts] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect((opts.signal as AbortSignal).aborted).toBe(true);
  });
});
