'use client';

import { useCallback, useState } from 'react';
import { createUploadQueue, type UploadQueueOptions } from '@/features/garments/lib/uploadQueue';

export interface UseUploadQueueResult {
  active: readonly File[];
  queued: readonly File[];
  enqueue: (files: File[]) => void;
  settle: (file: File) => void;
}

/**
 * Reactive wrapper around the pure `createUploadQueue` engine (`features/garments/lib/uploadQueue.ts`).
 *
 * The engine's own signature takes a static `files` array (`createUploadQueue(files, options)`),
 * matching spec §2.3.1's `useUploadQueue(files, options)`. Real usage is incremental — the user
 * can drop files more than once — so this hook adapts that to `enqueue`/`settle` calls. The
 * engine instance itself is held in `useState` (not `useRef`) so it's never read outside an
 * event handler or a render-safe lazy initializer; `active`/`queued` are plain React state,
 * refreshed from the engine only inside `enqueue`/`settle`. `maxConcurrent` is read once at
 * mount (matches `VISION_CONFIG.maxConcurrentUploads`, not expected to change at runtime).
 */
export function useUploadQueue(options?: UploadQueueOptions): UseUploadQueueResult {
  const [engine] = useState(() => createUploadQueue([], options));
  const [active, setActive] = useState<readonly File[]>(() => engine.active);
  const [queued, setQueued] = useState<readonly File[]>(() => engine.queued);

  const enqueue = useCallback(
    (files: File[]) => {
      engine.enqueue(files);
      setActive(engine.active);
      setQueued(engine.queued);
    },
    [engine]
  );

  const settle = useCallback(
    (file: File) => {
      engine.settle(file);
      setActive(engine.active);
      setQueued(engine.queued);
    },
    [engine]
  );

  return { active, queued, enqueue, settle };
}
