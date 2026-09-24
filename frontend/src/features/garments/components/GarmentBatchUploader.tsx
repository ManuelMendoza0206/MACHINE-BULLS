'use client';

import { useRef, useState, type JSX } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { GarmentDropzone } from '@/features/garments/components/GarmentDropzone';
import { GarmentAnalysisResult } from '@/features/garments/components/GarmentAnalysisResult';
import { useUploadQueue } from '@/features/garments/hooks/useUploadQueue';
import type { GarmentUploadResponse } from '@/schemas/api/garments';

let nextFileKey = 0;

/** Stable React keys for `File` objects, which have no natural id of their own. */
function useFileKeys(): (file: File) => number {
  const map = useRef(new WeakMap<File, number>());
  return (file: File): number => {
    let key = map.current.get(file);
    if (key === undefined) {
      key = nextFileKey++;
      map.current.set(file, key);
    }
    return key;
  };
}

function QueuedPlaceholder({ position }: { position: number }): JSX.Element {
  return (
    <Card>
      <CardContent className="flex h-40 items-center justify-center p-4 text-center text-sm text-muted-foreground">
        En cola — posición {position}
      </CardContent>
    </Card>
  );
}

/**
 * Drives the batch upload: dropzone feeds `useUploadQueue`, which caps how many
 * `GarmentAnalysisResult` instances run `detectBlur → useUploadGarment` at once
 * (wardrobe-flow/spec.md — "Subida por lote con techo de concurrencia"). Each item tracks
 * its own state independently, so one failure never hides or blocks the rest of the batch.
 *
 * Renders from `allFiles` (every file ever dropped, kept for the component's lifetime), not
 * from `queue.active` — a file leaving `active` only means it freed its concurrency slot, it
 * does NOT mean its card should disappear. Only files still in `queue.queued` render as the
 * lightweight waiting placeholder; everything else (currently uploading, or already
 * settled/reviewed/confirmed) renders its own `GarmentAnalysisResult`, which owns that state.
 */
export function GarmentBatchUploader(): JSX.Element {
  const queue = useUploadQueue();
  const [allFiles, setAllFiles] = useState<File[]>([]);
  const getKey = useFileKeys();

  const handleFilesSelected = (files: File[]): void => {
    setAllFiles(prev => [...prev, ...files]);
    queue.enqueue(files);
  };

  const handleConfirmed = (_garment: GarmentUploadResponse): void => {
    // GarmentAnalysisResult renders its own confirmed read-only card; nothing else to do here
    // until /wardrobe has a real "already-owned garments" list to append to (blocked on G1).
  };

  return (
    <div className="space-y-6">
      <GarmentDropzone onFilesSelected={handleFilesSelected} />
      {allFiles.length > 0 ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {allFiles.map(file => {
            const queuePosition = queue.queued.indexOf(file);
            return queuePosition === -1 ? (
              <GarmentAnalysisResult
                key={getKey(file)}
                file={file}
                onConfirmed={handleConfirmed}
                onSettled={() => queue.settle(file)}
              />
            ) : (
              <QueuedPlaceholder key={getKey(file)} position={queuePosition + 1} />
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
