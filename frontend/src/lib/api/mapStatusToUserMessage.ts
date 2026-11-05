/**
 * Pure mapping from HTTP status (+ optional body) to a user-facing message.
 * Tested in isolation; no side-effects, no i18n yet — single language per spec §2.6.
 */
export function mapStatusToUserMessage(status: number, body?: unknown): string {
  if (status === 400) return 'Solicitud inválida. Revisa los datos enviados.';
  if (status === 401 || status === 403)
    return 'Sesión expirada o sin permiso. Inicia sesión nuevamente.';
  if (status === 404) return 'Recurso no encontrado.';
  if (status === 422) {
    if (
      body !== null &&
      body !== undefined &&
      typeof body === 'object' &&
      'detail' in body &&
      typeof (body as { detail: unknown }).detail === 'string' &&
      ((body as { detail: string }).detail as string).length > 0
    ) {
      return (body as { detail: string }).detail;
    }
    if (
      body !== null &&
      body !== undefined &&
      typeof body === 'object' &&
      'message' in body &&
      typeof (body as { message: unknown }).message === 'string' &&
      ((body as { message: string }).message as string).length > 0
    ) {
      return (body as { message: string }).message;
    }
    return 'La solicitud no pudo ser procesada. Verifica los datos.';
  }
  if (status === 429) return 'Demasiadas solicitudes, espera un momento e intenta nuevamente.';
  if (status >= 500) return 'Error del servidor. Intenta nuevamente en unos instantes.';

  return 'Ocurrió un error inesperado. Intenta nuevamente.';
}
