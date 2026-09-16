import { describe, it, expect, vi, beforeEach } from 'vitest';
import { detectBlur } from '@/lib/vision/detectBlur';
import { VISION_CONFIG } from '@/config/vision';
import { decodeImageToGrayscale, type GrayscaleImage } from '@/lib/vision/decodeImage';

vi.mock('@/lib/vision/decodeImage', () => ({
  decodeImageToGrayscale: vi.fn(),
}));

const decodeMock = vi.mocked(decodeImageToGrayscale);

function grayImage(pixels: number[], width: number, height: number): GrayscaleImage {
  return { data: Float64Array.from(pixels), width, height };
}

function sharpGray(size = 16): GrayscaleImage {
  const pixels: number[] = [];
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      pixels.push((x + y) % 2 === 0 ? 0 : 255);
    }
  }
  return grayImage(pixels, size, size);
}

function blurryGray(size = 16): GrayscaleImage {
  const pixels: number[] = [];
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      pixels.push(Math.round((x / (size - 1)) * 255));
    }
  }
  return grayImage(pixels, size, size);
}

const fakeFile = (): File => new File([new Uint8Array(8)], 'garment.jpg', { type: 'image/jpeg' });

describe('detectBlur', () => {
  beforeEach(() => {
    decodeMock.mockReset();
  });

  it('flags a sharp photo as not blurry', async () => {
    decodeMock.mockResolvedValue(sharpGray());
    const result = await detectBlur(fakeFile());
    expect(result.isBlurry).toBe(false);
    expect(result.varianceScore).toBeGreaterThan(VISION_CONFIG.blurThreshold);
  });

  it('flags a smooth/blurred photo as blurry', async () => {
    decodeMock.mockResolvedValue(blurryGray());
    const result = await detectBlur(fakeFile());
    expect(result.isBlurry).toBe(true);
    expect(result.varianceScore).toBeLessThan(VISION_CONFIG.blurThreshold);
  });

  it('honours an explicit threshold over the config default', async () => {
    decodeMock.mockResolvedValue(blurryGray());
    // A threshold of 0 means nothing counts as blurry.
    const result = await detectBlur(fakeFile(), 0);
    expect(result.isBlurry).toBe(false);
  });

  it('returns a finite raw variance score for tuning', async () => {
    decodeMock.mockResolvedValue(sharpGray());
    const result = await detectBlur(fakeFile());
    expect(typeof result.varianceScore).toBe('number');
    expect(Number.isFinite(result.varianceScore)).toBe(true);
  });

  it('skips the decode entirely for files above the size ceiling', async () => {
    const huge = { size: VISION_CONFIG.maxImageSizeBytes + 1, name: 'huge.jpg' } as File;
    const result = await detectBlur(huge);
    expect(result).toEqual({ isBlurry: false, varianceScore: Number.NaN });
    expect(decodeMock).not.toHaveBeenCalled();
  });

  it('resolves asynchronously without blocking the caller', async () => {
    decodeMock.mockResolvedValue(sharpGray());
    const pending = detectBlur(fakeFile());
    expect(pending).toBeInstanceOf(Promise);
    await expect(pending).resolves.toBeDefined();
  });
});
