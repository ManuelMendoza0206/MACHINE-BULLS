'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { getVtonJobStatus } from '@/features/vton/api/getVtonJobStatus';
import { VtonJobTimeoutError, type StyleMeError } from '@/lib/errors';
import type { VtonJobStatusResponse } from '@/schemas/api/vton';

export interface UseVtonJobStatusOptions {
  jobId: string | null;
  timeoutMs?: number;
  enabled?: boolean;
}

export interface UseVtonJobStatusResult {
  status: 'idle' | 'pending' | 'processing' | 'completed' | 'failed' | 'timeout';
  data: VtonJobStatusResponse | undefined;
  error: StyleMeError | undefined;
  elapsedMs: number;
  attempt: number;
}

const DEFAULT_TIMEOUT_MS = 90_000;
const INITIAL_INTERVAL_MS = 2_000;
const BACKOFF_FACTOR = 1.5;
const MAX_INTERVAL_MS = 8_000;

/**
 * Hook de polling para consultar el ciclo de vida de un VTONJob con backoff
 * exponencial suave (2s -> 3s -> 4.5s -> 6.75s -> 8s máx), pausa en pestaña oculta
 * y timeout local configurable que no cancela el job en backend (vton-flow spec §2.2).
 */
export function useVtonJobStatus({
  jobId,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  enabled = true,
}: UseVtonJobStatusOptions): UseVtonJobStatusResult {
  const isRunnable = Boolean(jobId && enabled);

  const [status, setStatus] = useState<UseVtonJobStatusResult['status']>('pending');
  const [data, setData] = useState<VtonJobStatusResponse | undefined>(undefined);
  const [error, setError] = useState<StyleMeError | undefined>(undefined);
  const [attempt, setAttempt] = useState(0);
  const [elapsedMs, setElapsedMs] = useState(0);

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const elapsedMsRef = useRef(0);
  const intervalMsRef = useRef(INITIAL_INTERVAL_MS);
  const isPausedRef = useRef(false);

  // Bucle de polling
  useEffect(() => {
    if (!isRunnable || !jobId) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      return;
    }

    if (status === 'completed' || status === 'failed' || status === 'timeout') {
      return;
    }

    const handleVisibility = () => {
      if (typeof document === 'undefined') return;
      isPausedRef.current = document.visibilityState !== 'visible';
    };

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibility);
    }

    const scheduleNext = () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(async () => {
        if (isPausedRef.current) {
          scheduleNext();
          return;
        }

        const currentInterval = intervalMsRef.current;
        elapsedMsRef.current += currentInterval;
        setElapsedMs(elapsedMsRef.current);

        if (elapsedMsRef.current >= timeoutMs) {
          setStatus('timeout');
          setError(
            new VtonJobTimeoutError(`VTON job ${jobId} timed out after ${timeoutMs}ms`, jobId)
          );
          return;
        }

        try {
          const res = await getVtonJobStatus(jobId);
          setData(res);

          if (res.status === 'completed') {
            setStatus('completed');
            return;
          }
          if (res.status === 'failed') {
            setStatus('failed');
            return;
          }

          setStatus(res.status);
          setAttempt(a => a + 1);
          intervalMsRef.current = Math.min(intervalMsRef.current * BACKOFF_FACTOR, MAX_INTERVAL_MS);
          scheduleNext();
        } catch {
          // Error transitorio de red: reintenta con backoff
          setAttempt(a => a + 1);
          intervalMsRef.current = Math.min(intervalMsRef.current * BACKOFF_FACTOR, MAX_INTERVAL_MS);
          scheduleNext();
        }
      }, intervalMsRef.current);
    };

    scheduleNext();

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibility);
      }
    };
  }, [isRunnable, jobId, enabled, status, timeoutMs]);

  if (!isRunnable) {
    return {
      status: 'idle',
      data: undefined,
      error: undefined,
      elapsedMs: 0,
      attempt: 0,
    };
  }

  return {
    status,
    data,
    error,
    elapsedMs,
    attempt,
  };
}

/**
 * Consulta manual de un solo disparo post-timeout (vton-flow spec §2.3).
 * No reinicia el loop automático de polling.
 */
export function useManualVtonStatusCheck(jobId: string | null): {
  check: () => Promise<VtonJobStatusResponse | undefined>;
  data: VtonJobStatusResponse | undefined;
  isLoading: boolean;
  error: unknown;
} {
  const [data, setData] = useState<VtonJobStatusResponse | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<unknown>(undefined);

  const check = useCallback(async (): Promise<VtonJobStatusResponse | undefined> => {
    if (!jobId) return undefined;
    setIsLoading(true);
    setError(undefined);
    try {
      const res = await getVtonJobStatus(jobId);
      setData(res);
      return res;
    } catch (err) {
      setError(err);
      return undefined;
    } finally {
      setIsLoading(false);
    }
  }, [jobId]);

  return {
    check,
    data,
    isLoading,
    error,
  };
}
