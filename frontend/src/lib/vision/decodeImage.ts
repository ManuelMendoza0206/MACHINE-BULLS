/**
 * Browser-only glue: decode an image `File` into a grayscale (Rec. 601 luma, 0–255) buffer.
 *
 * Isolated in its own module so `detectBlur` can be unit-tested with this mocked — jsdom has no
 * canvas / `createImageBitmap`, so this path only runs in a real browser (or a Playwright test).
 */
export interface GrayscaleImage {
  data: Float64Array;
  width: number;
  height: number;
}

export async function decodeImageToGrayscale(file: File): Promise<GrayscaleImage> {
  const bitmap = await createImageBitmap(file);
  const { width, height } = bitmap;

  try {
    const ctx = createContext(width, height);
    ctx.drawImage(bitmap, 0, 0);
    const { data } = ctx.getImageData(0, 0, width, height);

    const gray = new Float64Array(width * height);
    for (let i = 0; i < gray.length; i += 1) {
      const o = i * 4;
      gray[i] =
        0.299 * (data[o] as number) +
        0.587 * (data[o + 1] as number) +
        0.114 * (data[o + 2] as number);
    }

    return { data: gray, width, height };
  } finally {
    bitmap.close();
  }
}

function createContext(width: number, height: number): CanvasRenderingContext2D {
  if (typeof OffscreenCanvas !== 'undefined') {
    const ctx = new OffscreenCanvas(width, height).getContext('2d');
    if (ctx) {
      return ctx as unknown as CanvasRenderingContext2D;
    }
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('2D canvas context unavailable — cannot run the blur check');
  }
  return ctx;
}
