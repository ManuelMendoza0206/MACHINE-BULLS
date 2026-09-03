import { z } from 'zod';

import { ApiError, NetworkError, ValidationError } from '@/lib/errors';

export interface RequestConfig {
  path: string;
  method: 'GET' | 'POST';
  body?: FormData | Record<string, unknown>;
  timeoutMs: number;
  signal?: AbortSignal;
}

function getBaseUrl(): string {
  const url = process.env['NEXT_PUBLIC_API_BASE_URL'];
  if (!url || url.trim() === '') {
    throw new Error(
      'NEXT_PUBLIC_API_BASE_URL is not defined. Set it in .env.local (see .env.example).'
    );
  }
  return url.replace(/\/$/, '');
}

export async function apiRequest<T>(config: RequestConfig, schema: z.ZodType<T>): Promise<T> {
  const baseUrl = getBaseUrl();
  const url = `${baseUrl}${config.path}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), config.timeoutMs);

  // Respect external signal — if it aborts, abort our controller too
  const onExternalAbort = (): void => controller.abort();
  if (config.signal) {
    if (config.signal.aborted) {
      controller.abort();
    } else {
      config.signal.addEventListener('abort', onExternalAbort, { once: true });
    }
  }

  let headers: Record<string, string> | undefined;
  let body: BodyInit | undefined;

  if (config.body !== undefined) {
    if (config.body instanceof FormData) {
      // Let browser set Content-Type with boundary
      body = config.body;
    } else {
      headers = { 'Content-Type': 'application/json' };
      body = JSON.stringify(config.body);
    }
  }

  try {
    const response = await fetch(url, {
      method: config.method,
      headers,
      body,
      signal: controller.signal,
    });

    if (!response.ok) {
      let parsedBody: unknown;
      try {
        const text = await response.text();
        parsedBody = text ? JSON.parse(text) : undefined;
      } catch {
        parsedBody = undefined;
      }
      throw new ApiError(
        `Request failed with status ${response.status}`,
        response.status,
        parsedBody
      );
    }

    const json = (await response.json()) as unknown;
    const result = schema.safeParse(json);
    if (!result.success) {
      throw new ValidationError('Response validation failed', result.error.issues);
    }
    return result.data;
  } catch (error) {
    if (error instanceof ApiError || error instanceof ValidationError) {
      throw error;
    }

    if (error instanceof DOMException && error.name === 'AbortError') {
      // Distinguish timeout (our controller) vs external abort
      // Both map to NetworkError per spec §2.2 #6, with distinguishable message
      const isTimeout = !config.signal?.aborted;
      throw new NetworkError(
        isTimeout ? `Request timeout after ${String(config.timeoutMs)}ms` : 'Request aborted',
        error
      );
    }

    if (error instanceof Error && error.name === 'AbortError') {
      const isTimeout = !config.signal?.aborted;
      throw new NetworkError(
        isTimeout ? `Request timeout after ${String(config.timeoutMs)}ms` : 'Request aborted',
        error
      );
    }

    // fetch TypeError (network failure, DNS, offline, etc.)
    throw new NetworkError(
      error instanceof Error ? error.message : 'Network request failed',
      error
    );
  } finally {
    clearTimeout(timeoutId);
    if (config.signal) {
      config.signal.removeEventListener('abort', onExternalAbort);
    }
  }
}
