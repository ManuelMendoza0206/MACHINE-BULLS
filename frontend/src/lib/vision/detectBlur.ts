import { VISION_CONFIG } from '@/config/vision';
import { decodeImageToGrayscale } from '@/lib/vision/decodeImage';
import { laplacianVariance } from '@/lib/vision/laplacianVariance';

export interface BlurCheckResult {
  isBlurry: boolean;
  /** Raw Laplacian variance — exposed for threshold tuning in tests (spec §2.2). */
  varianceScore: number;
}

/**
 * Client-side blur heuristic for a garment photo (spec §2.2, §3.1).
 *
 * Decodes the image, runs a Laplacian-variance sharpness estimate, and compares it to
 * `threshold`. This is **informational only** — a `true` result surfaces a warning badge but
 * never blocks the upload; the user decides whether to proceed.
 *
 * Async and non-blocking: the decode yields to the event loop, so the main thread is not held
 * for the duration. Files larger than `VISION_CONFIG.maxImageSizeBytes` skip the check and are
 * reported as not blurry (score `NaN`) rather than risking a long stall.
 *
 * @param file - the image selected by the user
 * @param threshold - variance below which the image is flagged blurry; defaults to
 *   `VISION_CONFIG.blurThreshold`
 */
export async function detectBlur(
  file: File,
  threshold: number = VISION_CONFIG.blurThreshold
): Promise<BlurCheckResult> {
  if (file.size > VISION_CONFIG.maxImageSizeBytes) {
    return { isBlurry: false, varianceScore: Number.NaN };
  }

  const { data, width, height } = await decodeImageToGrayscale(file);
  const varianceScore = laplacianVariance(data, width, height);

  return { isBlurry: varianceScore < threshold, varianceScore };
}
