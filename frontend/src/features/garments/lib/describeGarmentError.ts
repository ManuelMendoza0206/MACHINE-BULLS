import { ApiError } from '@/lib/errors';
import { mapStatusToUserMessage } from '@/lib/api/mapStatusToUserMessage';

/** Turns any `StyleMeError` (or unknown) into a short, user-facing message. */
export function describeGarmentError(error: unknown): string {
  if (error instanceof ApiError) {
    return mapStatusToUserMessage(error.status, error.responseBody);
  }
  if (error instanceof Error) {
    return error.name === 'NetworkError'
      ? 'No pudimos conectar con el servidor. Revisá tu conexión.'
      : 'La respuesta del servidor no tuvo el formato esperado.';
  }
  return 'Ocurrió un error inesperado.';
}
