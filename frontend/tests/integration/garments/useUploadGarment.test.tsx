import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { server } from '../../fixtures/msw/server';
import { useUploadGarment } from '@/features/garments/hooks/useUploadGarment';
import { ApiError, NetworkError } from '@/lib/errors';

const originalEnv = process.env['NEXT_PUBLIC_API_BASE_URL'];

beforeEach(() => {
  process.env['NEXT_PUBLIC_API_BASE_URL'] = 'https://api.example.com';
});

afterEach(() => {
  if (originalEnv === undefined) {
    delete process.env['NEXT_PUBLIC_API_BASE_URL'];
  } else {
    process.env['NEXT_PUBLIC_API_BASE_URL'] = originalEnv;
  }
});

function wrapper({ children }: { children: ReactNode }): React.JSX.Element {
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

const file = new File(['x'], 'shirt.jpg', { type: 'image/jpeg' });

describe('useUploadGarment', () => {
  it('starts idle', () => {
    const { result } = renderHook(() => useUploadGarment(), { wrapper });
    expect(result.current.status).toBe('idle');
    expect(result.current.data).toBeUndefined();
    expect(result.current.error).toBeUndefined();
  });

  it('goes analyzing → success with the fixture shape on a 200', async () => {
    const { result } = renderHook(() => useUploadGarment(), { wrapper });

    act(() => result.current.upload(file));

    await waitFor(() => expect(result.current.status).toBe('success'));
    expect(result.current.data?.category).toBe('shirt');
    expect(result.current.error).toBeUndefined();
  });

  it('goes analyzing → error with a typed ApiError on a 500', async () => {
    server.use(http.post('*/api/v1/garments/upload', () => HttpResponse.json({}, { status: 500 })));
    const { result } = renderHook(() => useUploadGarment(), { wrapper });

    act(() => result.current.upload(file));
    await waitFor(() => expect(result.current.status).toBe('error'));

    expect(result.current.error).toBeInstanceOf(ApiError);
    expect(result.current.data).toBeUndefined();
  });

  it('maps a network failure to a typed NetworkError, never an untyped error', async () => {
    server.use(http.post('*/api/v1/garments/upload', () => HttpResponse.error()));
    const { result } = renderHook(() => useUploadGarment(), { wrapper });

    act(() => result.current.upload(file));
    await waitFor(() => expect(result.current.status).toBe('error'));

    expect(result.current.error).toBeInstanceOf(NetworkError);
  });

  it('calls onSettled exactly once per upload attempt, on success or error', async () => {
    const onSettled = vi.fn();
    const { result } = renderHook(() => useUploadGarment({ onSettled }), { wrapper });

    act(() => result.current.upload(file));
    await waitFor(() => expect(result.current.status).toBe('success'));

    expect(onSettled).toHaveBeenCalledTimes(1);
  });
});
