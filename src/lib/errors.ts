import { type ZodIssue } from 'zod';

export abstract class StyleMeError extends Error {
  abstract readonly code: string;

  constructor(message: string, readonly cause?: unknown) {
    super(message);
    this.name = this.constructor.name;
    Object.setPrototypeOf(this, StyleMeError.prototype);
  }
}

export class ApiError extends StyleMeError {
  readonly code = 'API_ERROR';

  constructor(
    message: string,
    readonly status: number,
    readonly responseBody?: unknown,
    cause?: unknown
  ) {
    super(message, cause);
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

export class ValidationError extends StyleMeError {
  readonly code = 'VALIDATION_ERROR';

  constructor(message: string, readonly issues: ZodIssue[], cause?: unknown) {
    super(message, cause);
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

export class NetworkError extends StyleMeError {
  readonly code = 'NETWORK_ERROR';

  constructor(message: string, cause?: unknown) {
    super(message, cause);
    Object.setPrototypeOf(this, NetworkError.prototype);
  }
}

export class VtonJobTimeoutError extends StyleMeError {
  readonly code = 'VTON_JOB_TIMEOUT';

  constructor(message: string, readonly jobId: string, cause?: unknown) {
    super(message, cause);
    Object.setPrototypeOf(this, VtonJobTimeoutError.prototype);
  }
}
