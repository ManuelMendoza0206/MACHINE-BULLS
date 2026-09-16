import { describe, it, expect } from 'vitest';
import { laplacianVariance } from '@/lib/vision/laplacianVariance';

/** Build a `size × size` checkerboard alternating 0 / 255 — maximal local contrast. */
function checkerboard(size: number): number[] {
  const out: number[] = [];
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      out.push((x + y) % 2 === 0 ? 0 : 255);
    }
  }
  return out;
}

/** Build a `size × size` smooth horizontal ramp — very low local contrast. */
function smoothRamp(size: number): number[] {
  const out: number[] = [];
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      out.push(Math.round((x / (size - 1)) * 255));
    }
  }
  return out;
}

describe('laplacianVariance', () => {
  it('reports high variance for a sharp, high-contrast image', () => {
    const sharp = laplacianVariance(checkerboard(16), 16, 16);
    expect(sharp).toBeGreaterThan(10_000);
  });

  it('reports near-zero variance for a smooth gradient', () => {
    const blurry = laplacianVariance(smoothRamp(16), 16, 16);
    expect(blurry).toBeLessThan(50);
  });

  it('ranks a sharp image far above a blurred one', () => {
    const sharp = laplacianVariance(checkerboard(16), 16, 16);
    const blurry = laplacianVariance(smoothRamp(16), 16, 16);
    expect(sharp).toBeGreaterThan(blurry * 100);
  });

  it('returns 0 for a uniform fill (no edges anywhere)', () => {
    const flat = new Array(9).fill(128);
    expect(laplacianVariance(flat, 3, 3)).toBe(0);
  });

  it('is deterministic and does not throw for a 1×1 image', () => {
    expect(laplacianVariance([200], 1, 1)).toBe(0);
    expect(laplacianVariance([200], 1, 1)).toBe(0);
  });

  it('returns 0 for any image too small to hold a 3×3 neighbourhood', () => {
    expect(laplacianVariance([0, 255, 255, 0], 2, 2)).toBe(0);
    expect(laplacianVariance([0, 255, 128, 0, 255, 128], 3, 2)).toBe(0);
  });

  it('matches a hand-computed single-interior-pixel case', () => {
    // 3×3, centre 255, all 8 neighbours 0 → the one response is 8*255 - 0 = 2040.
    // A single response value has zero variance around its own mean.
    expect(laplacianVariance([0, 0, 0, 0, 255, 0, 0, 0, 0], 3, 3)).toBe(0);

    // 4×3 has two interior pixels: (1,1)=255 → 8*255 - 0 = 2040; (1,2)=0 → 8*0 - 255 = -255.
    // mean = 892.5, variance = (2040 - 892.5)² = 1147.5².
    const twoPixels = laplacianVariance([0, 0, 0, 0, 0, 255, 0, 0, 0, 0, 0, 0], 4, 3);
    expect(twoPixels).toBeCloseTo(1147.5 * 1147.5, 5);
  });
});
