import '@testing-library/jest-dom';
import { beforeAll, afterAll } from 'vitest';

// Mock fetch for tests
global.fetch = async (): Promise<Response> => {
  return new Response(JSON.stringify({}), { status: 200 });
};

// Suppress console.error in tests unless explicitly needed
const originalError = console.error;
beforeAll((): void => {
  console.error = (...args: unknown[]): void => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('Warning: ReactDOM.render')
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});
