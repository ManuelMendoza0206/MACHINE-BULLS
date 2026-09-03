import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// Unmount React trees rendered by RTL after every test to avoid cross-test leakage.
afterEach(() => {
  cleanup();
});
