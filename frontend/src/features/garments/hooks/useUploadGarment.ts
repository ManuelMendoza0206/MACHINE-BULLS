'use client';

import { useMutation } from '@tanstack/react-query';
import { uploadGarment } from '@/features/garments/api/uploadGarment';
import type { GarmentUploadResponse } from '@/schemas/api/garments';
import type { StyleMeError } from '@/lib/errors';

export interface UseUploadGarmentOptions {
  /** Fires once per upload attempt (success or error) — not part of spec §2.3's minimal
   * signature, added so callers (e.g. the upload queue) can free a concurrency slot without
   * reaching into React effects to mirror mutation state. */
  onSettled?: () => void;
}

export interface UseUploadGarmentResult {
  upload: (file: File) => void;
  status: 'idle' | 'analyzing' | 'success' | 'error';
  data: GarmentUploadResponse | undefined;
  error: StyleMeError | undefined;
}

const STATUS_MAP = {
  idle: 'idle',
  pending: 'analyzing',
  success: 'success',
  error: 'error',
} as const satisfies Record<string, UseUploadGarmentResult['status']>;

/**
 * Uploads one garment photo and exposes the 4 states spec §2.3 requires. Wraps
 * `uploadGarment` in `useMutation` — the error is always a `StyleMeError` subclass
 * (never a raw/untyped error), since `apiRequest` guarantees that at the network layer.
 */
export function useUploadGarment(options: UseUploadGarmentOptions = {}): UseUploadGarmentResult {
  const mutation = useMutation<GarmentUploadResponse, StyleMeError, File>({
    mutationFn: file => uploadGarment(file),
    onSettled: options.onSettled,
  });

  return {
    // `mutation.mutate` is already a stable reference across renders (TanStack Query memoizes
    // it) — return it directly rather than wrapping in a new arrow function every render.
    upload: mutation.mutate,
    status: STATUS_MAP[mutation.status],
    data: mutation.data,
    error: mutation.error ?? undefined,
  };
}
