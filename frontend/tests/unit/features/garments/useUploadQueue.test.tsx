import { describe, it, expect } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useUploadQueue } from '@/features/garments/hooks/useUploadQueue';

const files = (n: number): File[] =>
  Array.from({ length: n }, (_, i) => new File(['x'], `g${i}.jpg`, { type: 'image/jpeg' }));

describe('useUploadQueue', () => {
  it('activates up to maxConcurrent and queues the rest', () => {
    const { result } = renderHook(() => useUploadQueue({ maxConcurrent: 2 }));

    act(() => result.current.enqueue(files(5)));

    expect(result.current.active).toHaveLength(2);
    expect(result.current.queued).toHaveLength(3);
  });

  it('promotes the next queued file when an active one settles — success or failure', () => {
    const { result } = renderHook(() => useUploadQueue({ maxConcurrent: 2 }));
    act(() => result.current.enqueue(files(3)));

    const firstActive = result.current.active[0] as File;
    act(() => result.current.settle(firstActive));

    expect(result.current.active).toHaveLength(2);
    expect(result.current.queued).toHaveLength(0);
  });

  it('re-renders the component using it as files move through the queue', () => {
    const { result } = renderHook(() => useUploadQueue({ maxConcurrent: 1 }));
    act(() => result.current.enqueue(files(2)));

    expect(result.current.active).toHaveLength(1);
    expect(result.current.queued).toHaveLength(1);

    act(() => result.current.settle(result.current.active[0] as File));

    expect(result.current.active).toHaveLength(1);
    expect(result.current.queued).toHaveLength(0);
  });
});
