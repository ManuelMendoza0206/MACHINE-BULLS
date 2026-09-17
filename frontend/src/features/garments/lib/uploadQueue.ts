import { VISION_CONFIG } from '@/config/vision';

/**
 * Client-side batch-upload queue for garment photos (spec §2.3.1).
 *
 * The "batch" upload is parallelism in the browser, not a network batch: each file runs its own
 * `detectBlur → useUploadGarment` cycle. This engine only decides **which** files may run right
 * now — it holds no async logic itself. The caller drives it: start uploads for everything in
 * `active`, and call `settle(file)` when that file's upload resolves *or rejects*. Either way
 * the next file in FIFO order is promoted, so:
 *
 *  - the concurrency ceiling is never exceeded, and
 *  - a single failure never stalls or cancels the rest of the queue.
 *
 * In Sprint 3 the `useUploadQueue` React hook (spec §2.3.1) becomes a thin wrapper over this,
 * wiring `settle` to the mutation's `onSettled`.
 */
export interface UploadQueueOptions {
  /** Max files in `active` at once. Defaults to `VISION_CONFIG.maxConcurrentUploads`. */
  maxConcurrent?: number;
}

export interface UploadQueue {
  /** Files that may upload right now. */
  readonly active: readonly File[];
  /** Files waiting for a slot, in FIFO order. */
  readonly queued: readonly File[];
  /** Mark an active file as finished (success or failure); promotes the next queued file. */
  settle: (file: File) => void;
  /** Append more files to the tail of the queue (e.g. a second drop). */
  enqueue: (files: File[]) => void;
}

export function createUploadQueue(
  files: File[] = [],
  options: UploadQueueOptions = {}
): UploadQueue {
  const maxConcurrent = Math.max(
    1,
    Math.trunc(options.maxConcurrent ?? VISION_CONFIG.maxConcurrentUploads)
  );

  const active: File[] = [];
  const queued: File[] = [...files];

  const promote = (): void => {
    while (active.length < maxConcurrent && queued.length > 0) {
      active.push(queued.shift() as File);
    }
  };

  promote();

  return {
    get active() {
      return [...active];
    },
    get queued() {
      return [...queued];
    },
    settle(file) {
      const index = active.indexOf(file);
      if (index === -1) {
        return;
      }
      active.splice(index, 1);
      promote();
    },
    enqueue(more) {
      queued.push(...more);
      promote();
    },
  };
}
