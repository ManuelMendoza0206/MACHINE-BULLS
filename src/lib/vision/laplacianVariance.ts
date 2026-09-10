/**
 * Pure numeric core of the blur heuristic (spec §2.2).
 *
 * Given a single-channel (grayscale, 0–255) image in row-major order, convolve every interior
 * pixel with the 3×3 Laplacian kernel
 *
 *   -1 -1 -1
 *   -1  8 -1
 *   -1 -1 -1
 *
 * and return the variance of the response. A sharp image has strong edges → high variance; a
 * blurred one has smooth transitions → low variance. This is the same idea as OpenCV's
 * `cv2.Laplacian(img).var()`.
 *
 * No canvas, no DOM — fully unit-testable. The browser glue that turns a `File` into the
 * grayscale buffer lives in `./decodeImage`.
 */
export function laplacianVariance(gray: ArrayLike<number>, width: number, height: number): number {
  // Too small to hold a single 3×3 neighbourhood — deterministically "no detectable edges".
  if (width < 3 || height < 3) {
    return 0;
  }

  const responses: number[] = [];

  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const center = gray[y * width + x] as number;
      const neighbourSum =
        (gray[(y - 1) * width + (x - 1)] as number) +
        (gray[(y - 1) * width + x] as number) +
        (gray[(y - 1) * width + (x + 1)] as number) +
        (gray[y * width + (x - 1)] as number) +
        (gray[y * width + (x + 1)] as number) +
        (gray[(y + 1) * width + (x - 1)] as number) +
        (gray[(y + 1) * width + x] as number) +
        (gray[(y + 1) * width + (x + 1)] as number);

      responses.push(8 * center - neighbourSum);
    }
  }

  if (responses.length === 0) {
    return 0;
  }

  let mean = 0;
  for (const r of responses) {
    mean += r;
  }
  mean /= responses.length;

  let variance = 0;
  for (const r of responses) {
    const d = r - mean;
    variance += d * d;
  }
  variance /= responses.length;

  return variance;
}
