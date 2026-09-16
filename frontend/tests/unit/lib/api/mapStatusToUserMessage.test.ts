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
