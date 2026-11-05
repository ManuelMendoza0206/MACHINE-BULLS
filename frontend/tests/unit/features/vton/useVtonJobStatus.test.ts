import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as getVtonJobStatusModule from '@/features/vton/api/getVtonJobStatus';
import { useVtonJobStatus, useManualVtonStatusCheck } from '@/features/vton/hooks/useVtonJobStatus';
import { VtonJobTimeoutError } from '@/lib/errors';
import type { VtonJobStatusResponse } from '@/schemas/api/vton';

describe('useVtonJobStatus', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('permanece en idle si jobId es null o enabled es false', () => {
    const { result, rerender } = renderHook(
      ({ id, enabled }) => useVtonJobStatus({ jobId: id, enabled }),
      { initialProps: { id: null as string | null, enabled: true } }
    );

    expect(result.current.status).toBe('idle');
    expect(result.current.data).toBeUndefined();

    rerender({ id: '11111111-1111-1111-1111-111111111111', enabled: false });
    expect(result.current.status).toBe('idle');
  });

  it('inicia en pending y avanza con backoff exponencial suave', async () => {
    const getStatusSpy = vi.spyOn(getVtonJobStatusModule, 'getVtonJobStatus');
    const pendingResponse: VtonJobStatusResponse = {
      job_id: '11111111-1111-1111-1111-111111111111',
      status: 'processing',
    };
    getStatusSpy.mockResolvedValue(pendingResponse);

    const { result } = renderHook(() =>
      useVtonJobStatus({ jobId: '11111111-1111-1111-1111-111111111111', timeoutMs: 30_000 })
    );

    expect(result.current.status).toBe('pending');

    // 1er intervalo: 2000ms
    await act(async () => {
      vi.advanceTimersByTime(2000);
    });
    expect(getStatusSpy).toHaveBeenCalledTimes(1);
    expect(result.current.status).toBe('processing');
    expect(result.current.attempt).toBe(1);

    // 2do intervalo: 2000 * 1.5 = 3000ms
    await act(async () => {
      vi.advanceTimersByTime(3000);
    });
    expect(getStatusSpy).toHaveBeenCalledTimes(2);
    expect(result.current.attempt).toBe(2);

    // 3er intervalo: 3000 * 1.5 = 4500ms
    await act(async () => {
      vi.advanceTimersByTime(4500);
    });
    expect(getStatusSpy).toHaveBeenCalledTimes(3);
    expect(result.current.attempt).toBe(3);
  });

  it('se resuelve a completed y detiene el polling', async () => {
    const getStatusSpy = vi.spyOn(getVtonJobStatusModule, 'getVtonJobStatus');
    getStatusSpy.mockResolvedValueOnce({
      job_id: '11111111-1111-1111-1111-111111111111',
      status: 'completed',
      result_url: 'https://example.com/res.png',
    });

    const { result } = renderHook(() =>
      useVtonJobStatus({ jobId: '11111111-1111-1111-1111-111111111111' })
    );

    await act(async () => {
      vi.advanceTimersByTime(2000);
    });

    expect(result.current.status).toBe('completed');
    expect(result.current.data?.result_url).toBe('https://example.com/res.png');

    // Avanzar tiempo adicional no genera más llamadas
    await act(async () => {
      vi.advanceTimersByTime(10000);
    });
    expect(getStatusSpy).toHaveBeenCalledTimes(1);
  });

  it('se resuelve a failed con error_message', async () => {
    const getStatusSpy = vi.spyOn(getVtonJobStatusModule, 'getVtonJobStatus');
    getStatusSpy.mockResolvedValueOnce({
      job_id: '11111111-1111-1111-1111-111111111111',
      status: 'failed',
      error_message: 'No se detectó la silueta completa.',
    });

    const { result } = renderHook(() =>
      useVtonJobStatus({ jobId: '11111111-1111-1111-1111-111111111111' })
    );

    await act(async () => {
      vi.advanceTimersByTime(2000);
    });

    expect(result.current.status).toBe('failed');
    expect(result.current.data?.error_message).toBe('No se detectó la silueta completa.');
  });

  it('dispara VtonJobTimeoutError cuando elapsedMs alcanza el techo sin cancelar el job', async () => {
    const getStatusSpy = vi.spyOn(getVtonJobStatusModule, 'getVtonJobStatus');
    getStatusSpy.mockResolvedValue({
      job_id: '11111111-1111-1111-1111-111111111111',
      status: 'processing',
    });

    const { result } = renderHook(() =>
      useVtonJobStatus({ jobId: '11111111-1111-1111-1111-111111111111', timeoutMs: 5000 })
    );

    // 1er tick (2000ms, total 2000ms < 5000ms)
    await act(async () => {
      vi.advanceTimersByTime(2000);
    });
    expect(result.current.status).toBe('processing');

    // 2do tick (3000ms, total 5000ms >= 5000ms -> timeout)
    await act(async () => {
      vi.advanceTimersByTime(3000);
    });

    expect(result.current.status).toBe('timeout');
    expect(result.current.error).toBeInstanceOf(VtonJobTimeoutError);
    expect((result.current.error as VtonJobTimeoutError).jobId).toBe(
      '11111111-1111-1111-1111-111111111111'
    );
  });

  it('pausa polling cuando la pestaña se oculta', async () => {
    const getStatusSpy = vi.spyOn(getVtonJobStatusModule, 'getVtonJobStatus');
    getStatusSpy.mockResolvedValue({
      job_id: '11111111-1111-1111-1111-111111111111',
      status: 'processing',
    });

    renderHook(() => useVtonJobStatus({ jobId: '11111111-1111-1111-1111-111111111111' }));

    // Simular que la pestaña se oculta antes de dispararse el intervalo
    Object.defineProperty(document, 'visibilityState', {
      value: 'hidden',
      writable: true,
      configurable: true,
    });
    document.dispatchEvent(new Event('visibilitychange'));

    await act(async () => {
      vi.advanceTimersByTime(2000);
    });

    // En hidden no realiza la consulta
    expect(getStatusSpy).toHaveBeenCalledTimes(0);

    // Al volver a visible se reanuda
    Object.defineProperty(document, 'visibilityState', {
      value: 'visible',
      writable: true,
      configurable: true,
    });
    document.dispatchEvent(new Event('visibilitychange'));

    await act(async () => {
      vi.advanceTimersByTime(2000);
    });
    expect(getStatusSpy).toHaveBeenCalledTimes(1);
  });
});

describe('useManualVtonStatusCheck', () => {
  it('ejecuta una única consulta manual bajo demanda', async () => {
    const getStatusSpy = vi.spyOn(getVtonJobStatusModule, 'getVtonJobStatus');
    getStatusSpy.mockResolvedValueOnce({
      job_id: '11111111-1111-1111-1111-111111111111',
      status: 'completed',
      result_url: 'https://example.com/res.png',
    });

    const { result } = renderHook(() =>
      useManualVtonStatusCheck('11111111-1111-1111-1111-111111111111')
    );

    expect(result.current.data).toBeUndefined();
    expect(result.current.isLoading).toBe(false);

    let res: VtonJobStatusResponse | undefined;
    await act(async () => {
      res = await result.current.check();
    });

    expect(getStatusSpy).toHaveBeenCalledTimes(1);
    expect(getStatusSpy).toHaveBeenCalledWith('11111111-1111-1111-1111-111111111111');
    expect(res?.status).toBe('completed');
    expect(result.current.data?.result_url).toBe('https://example.com/res.png');
  });
});
