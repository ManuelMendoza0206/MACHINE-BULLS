import { describe, it, expect } from 'vitest';
import { createUploadQueue } from '@/features/garments/lib/uploadQueue';
import { VISION_CONFIG } from '@/config/vision';

function files(n: number): File[] {
  return Array.from({ length: n }, (_, i) => new File(['x'], `g${i}.jpg`, { type: 'image/jpeg' }));
}

const names = (fs: readonly File[]): string[] => fs.map(f => f.name);

describe('createUploadQueue', () => {
  it('activates up to the ceiling and queues the rest in FIFO order', () => {
    const q = createUploadQueue(files(5), { maxConcurrent: 2 });
    expect(names(q.active)).toEqual(['g0.jpg', 'g1.jpg']);
    expect(names(q.queued)).toEqual(['g2.jpg', 'g3.jpg', 'g4.jpg']);
  });

  it('promotes the next queued file when an active one settles', () => {
    const q = createUploadQueue(files(5), { maxConcurrent: 2 });
    q.settle(q.active[0] as File); // g0 done
    expect(names(q.active)).toEqual(['g1.jpg', 'g2.jpg']);
    expect(names(q.queued)).toEqual(['g3.jpg', 'g4.jpg']);
  });

  it('keeps advancing after a failure — one failed upload never stalls the queue', () => {
    const q = createUploadQueue(files(4), { maxConcurrent: 2 });
    // Caller calls settle on both success and failure; the queue does not care which.
    q.settle(q.active[1] as File); // g1 failed
    expect(names(q.active)).toEqual(['g0.jpg', 'g2.jpg']);
    q.settle(q.active[0] as File); // g0 failed too
    expect(names(q.active)).toEqual(['g2.jpg', 'g3.jpg']);
    expect(q.queued).toHaveLength(0);
  });

  it('drains completely as every file settles', () => {
    const q = createUploadQueue(files(3), { maxConcurrent: 1 });
    expect(names(q.active)).toEqual(['g0.jpg']);
    q.settle(q.active[0] as File);
    expect(names(q.active)).toEqual(['g1.jpg']);
    q.settle(q.active[0] as File);
    q.settle(q.active[0] as File);
    expect(q.active).toHaveLength(0);
    expect(q.queued).toHaveLength(0);
  });

  it.each([2, 4, 6])('respects a maxConcurrent of %i', max => {
    const q = createUploadQueue(files(10), { maxConcurrent: max });
    expect(q.active).toHaveLength(max);
    expect(q.queued).toHaveLength(10 - max);
  });

  it('defaults maxConcurrent to VISION_CONFIG.maxConcurrentUploads', () => {
    const q = createUploadQueue(files(10));
    expect(q.active).toHaveLength(VISION_CONFIG.maxConcurrentUploads);
  });

  it('ignores settle() for a file that is not active', () => {
    const q = createUploadQueue(files(3), { maxConcurrent: 1 });
    const stranger = new File(['x'], 'stranger.jpg', { type: 'image/jpeg' });
    q.settle(stranger);
    q.settle(q.queued[0] as File); // a queued (not active) file
    expect(names(q.active)).toEqual(['g0.jpg']);
    expect(q.queued).toHaveLength(2);
  });

  it('appends enqueued files to the tail and fills any free slots', () => {
    const q = createUploadQueue(files(2), { maxConcurrent: 3 });
    expect(q.active).toHaveLength(2);

    const extra = new File(['x'], 'extra.jpg', { type: 'image/jpeg' });
    q.enqueue([extra]);
    expect(names(q.active)).toEqual(['g0.jpg', 'g1.jpg', 'extra.jpg']); // fills the 3rd slot
    expect(q.queued).toHaveLength(0);

    const later = new File(['x'], 'later.jpg', { type: 'image/jpeg' });
    q.enqueue([later]);
    expect(names(q.queued)).toEqual(['later.jpg']);
  });

  it('exposes copies — external mutation cannot corrupt internal state', () => {
    const q = createUploadQueue(files(3), { maxConcurrent: 2 });
    (q.active as File[]).length = 0;
    expect(q.active).toHaveLength(2);
  });

  it('handles an empty file list', () => {
    const q = createUploadQueue();
    expect(q.active).toHaveLength(0);
    expect(q.queued).toHaveLength(0);
  });
});
