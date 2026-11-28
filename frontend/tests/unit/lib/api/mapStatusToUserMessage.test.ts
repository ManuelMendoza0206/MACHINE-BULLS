import { describe, it, expect } from 'vitest';
import { mapStatusToUserMessage } from '@/lib/api/mapStatusToUserMessage';

describe('mapStatusToUserMessage', () => {
  it('400 -> solicitud inválida', () => {
    expect(mapStatusToUserMessage(400)).toMatch(/Solicitud inválida/);
  });

  it('401/403 -> sesión expirada', () => {
    expect(mapStatusToUserMessage(401)).toMatch(/Sesión expirada/);
    expect(mapStatusToUserMessage(403)).toMatch(/Sesión expirada/);
  });

  it('404 -> no encontrado', () => {
    expect(mapStatusToUserMessage(404)).toMatch(/no encontrado/i);
  });

  it('422 -> uses detail from body', () => {
    expect(mapStatusToUserMessage(422, { detail: 'Imagen rechazada' })).toBe('Imagen rechazada');
  });

  it('422 -> uses message fallback', () => {
    expect(mapStatusToUserMessage(422, { message: 'Error de validación' })).toBe(
      'Error de validación'
    );
  });

  it('422 -> generic when no detail/message', () => {
    expect(mapStatusToUserMessage(422, {})).toMatch(/no pudo ser procesada/);
  });

  it('429 -> demasiadas solicitudes', () => {
    expect(mapStatusToUserMessage(429)).toMatch(/Demasiadas solicitudes/);
  });

  it('500 -> error del servidor', () => {
    expect(mapStatusToUserMessage(500)).toMatch(/Error del servidor/);
    expect(mapStatusToUserMessage(503)).toMatch(/Error del servidor/);
  });

  it('unknown -> genérico', () => {
    expect(mapStatusToUserMessage(418)).toMatch(/inesperado/);
  });
});

// E2-T10 — cobertura sistemática de TODAS las ramas, incluidos los códigos que caen
// al fallback seguro (4xx no mapeadas, 0, negativos, 6xx).
describe('mapStatusToUserMessage — cobertura total de códigos', () => {
  const table: Array<[number, RegExp]> = [
    [400, /Solicitud inválida/],
    [401, /Sesión expirada/],
    [403, /Sesión expirada/],
    [404, /no encontrado/i],
    [429, /Demasiadas solicitudes/],
    [500, /Error del servidor/],
    [501, /Error del servidor/],
    [502, /Error del servidor/],
    [503, /Error del servidor/],
    [599, /Error del servidor/],
    [600, /Error del servidor/],
    // Fallback seguro: nunca devuelve vacío ni lanza.
    [402, /inesperado/],
    [405, /inesperado/],
    [409, /inesperado/],
    [418, /inesperado/],
    [0, /inesperado/],
    [-1, /inesperado/],
  ];

  it.each(table)('status %i -> mensaje esperado', (status, expected) => {
    const message = mapStatusToUserMessage(status);
    expect(message).toMatch(expected);
    expect(message.trim().length).toBeGreaterThan(0);
  });

  it('el body solo interviene en 422 — el resto ignora cualquier detalle', () => {
    expect(mapStatusToUserMessage(400, { detail: 'me ignoran' })).toMatch(/Solicitud inválida/);
    expect(mapStatusToUserMessage(500, { detail: 'me ignoran' })).toMatch(/Error del servidor/);
    expect(mapStatusToUserMessage(404, { detail: 'me ignoran' })).toMatch(/no encontrado/i);
  });

  it('422 prioriza detail sobre message cuando ambos existen', () => {
    expect(mapStatusToUserMessage(422, { detail: 'primero', message: 'segundo' })).toBe('primero');
  });

  it('422 con detail vacío cae al mensaje genérico (nunca un string en blanco)', () => {
    expect(mapStatusToUserMessage(422, { detail: '' })).toMatch(/no pudo ser procesada/);
  });

  it('422 con detail no-string cae al mensaje genérico', () => {
    expect(mapStatusToUserMessage(422, { detail: 1234 })).toMatch(/no pudo ser procesada/);
    expect(mapStatusToUserMessage(422, { detail: { campo: 'x' } })).toMatch(
      /no pudo ser procesada/
    );
  });

  it('422 con message vacío cae al mensaje genérico', () => {
    expect(mapStatusToUserMessage(422, { message: '' })).toMatch(/no pudo ser procesada/);
  });

  it('422 con body nulo, ausente o de tipo escalar cae al genérico', () => {
    expect(mapStatusToUserMessage(422, null)).toMatch(/no pudo ser procesada/);
    expect(mapStatusToUserMessage(422)).toMatch(/no pudo ser procesada/);
    expect(mapStatusToUserMessage(422, 'detail')).toMatch(/no pudo ser procesada/);
    expect(mapStatusToUserMessage(422, [])).toMatch(/no pudo ser procesada/);
  });
});
