export interface CachedVtonResult {
  jobId: string;
  resultUrl: string;
}

const sessionCache = new Map<string, CachedVtonResult>();

/**
 * Genera una clave determinista para el par (outfitId, file) en la sesión actual.
 */
function getCacheKey(outfitId: string, file: File): string {
  return `${outfitId}:${file.name}:${file.size}`;
}

/**
 * Revisa si ya existe un resultado VTON completado para el par (outfit, foto) en la sesión actual.
 * Evita disparar un POST /vton/try-on redundante y costoso en GPU (spec 04 §2.2).
 */
export function checkCachedVtonResult(outfitId: string, file: File): CachedVtonResult | null {
  const key = getCacheKey(outfitId, file);
  return sessionCache.get(key) ?? null;
}

/**
 * Guarda en caché de sesión el resultado completado de un job VTON.
 */
export function setCachedVtonResult(
  outfitId: string,
  file: File,
  resultUrl: string,
  jobId: string
): void {
  const key = getCacheKey(outfitId, file);
  sessionCache.set(key, { jobId, resultUrl });
}

/**
 * Limpia la caché de sesión (útil para pruebas y reinicio explícito).
 */
export function clearCachedVtonResult(): void {
  sessionCache.clear();
}
