import { HttpResponse, type JsonBodyType } from 'msw';

/**
 * Helpers de respuestas MSW para tests (E1-T3).
 *
 * Componer escenarios de error/éxito del camino horrendo sin repetir el shape
 * de FastAPI (`{ detail }`) ni el apiari de `HttpResponse` en cada test.
 */

/** Respuesta JSON de error estilo FastAPI (`{ detail }`). */
export function mswError(status: number, detail?: string): HttpResponse<JsonBodyType> {
  return HttpResponse.json({ detail: detail ?? `error ${status}` }, { status });
}

/** Respuesta JSON normal (200 por defecto). */
export function mswJson(body: JsonBodyType, status = 200): HttpResponse<JsonBodyType> {
  return HttpResponse.json(body, { status });
}

/** Corte de red: `fetch` rechaza como en offline real. */
export function mswNetworkError(): HttpResponse<JsonBodyType> {
  return HttpResponse.error();
}
