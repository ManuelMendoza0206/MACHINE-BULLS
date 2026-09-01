import { describe, it, expect } from 'vitest';
import { ApiError, NetworkError, ValidationError, VtonJobTimeoutError } from '@/lib/errors';

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
