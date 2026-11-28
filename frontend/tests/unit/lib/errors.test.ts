import { describe, it, expect } from 'vitest';
import {
  ApiError,
  NetworkError,
  StyleMeError,
  ValidationError,
  VtonJobTimeoutError,
} from '@/lib/errors';

describe('error hierarchy', () => {
  it('ApiError has code and status', () => {
    const e = new ApiError('fail', 404, { detail: 'not found' });
    expect(e.code).toBe('API_ERROR');
    expect(e.status).toBe(404);
    expect(e.name).toBe('ApiError');
    expect(e instanceof ApiError).toBe(true);
  });

  it('ValidationError carries issues', () => {
    const e = new ValidationError('invalid', [
      { path: ['x'], message: 'bad', code: 'custom' } as never,
    ]);
    expect(e.code).toBe('VALIDATION_ERROR');
    expect(e.issues).toHaveLength(1);
  });

  it('NetworkError has correct code', () => {
    const e = new NetworkError('offline');
    expect(e.code).toBe('NETWORK_ERROR');
  });

  it('VtonJobTimeoutError carries jobId', () => {
    const e = new VtonJobTimeoutError('timeout', 'job-123');
    expect(e.code).toBe('VTON_JOB_TIMEOUT');
    expect(e.jobId).toBe('job-123');
  });
});

// E2-T10 — contrato de la jerarquia: TODAS las subclases deben seguir siendo Error,
// exponer un `name` estable (los mensajes de UI/log los discriminan) y poder encadenar
// la causa original sin perderla.
describe('error hierarchy — contrato compartido', () => {
  const cases: Array<[string, Error]> = [
    ['API_ERROR', new ApiError('boom', 500)],
    ['VALIDATION_ERROR', new ValidationError('bad', [])],
    ['NETWORK_ERROR', new NetworkError('offline')],
    ['VTON_JOB_TIMEOUT', new VtonJobTimeoutError('slow', 'job-1')],
  ];

  it.each(cases)('%s sigue siendo una Error instanciable', (_code, e) => {
    expect(e).toBeInstanceOf(Error);
    expect(e).toBeInstanceOf(StyleMeError);
    expect(typeof e.message).toBe('string');
    expect(e.message.length).toBeGreaterThan(0);
  });

  it('exponen un name estable igual a la clase concreta', () => {
    expect(new ApiError('x', 400).name).toBe('ApiError');
    expect(new ValidationError('x', []).name).toBe('ValidationError');
    expect(new NetworkError('x').name).toBe('NetworkError');
    expect(new VtonJobTimeoutError('x', 'j').name).toBe('VtonJobTimeoutError');
  });

  it('conservan la causa original para trazas', () => {
    const root = new Error('raiz del fallo');
    const e = new NetworkError('fallo de red', root);
    expect(e.cause).toBe(root);
  });

  it('ApiError defaulta responseBody a undefined cuando no hay body', () => {
    const e = new ApiError('sin body', 503);
    expect(e.responseBody).toBeUndefined();
  });

  it('ValidationError tolera una lista de issues vacia sin romper consumidores', () => {
    const e = new ValidationError('sin issues', []);
    expect(e.issues).toEqual([]);
    expect(e.code).toBe('VALIDATION_ERROR');
  });
});
