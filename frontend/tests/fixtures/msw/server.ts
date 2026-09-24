import { setupServer } from 'msw/node';
import { handlers } from './handlers';

/** Shared MSW server — lifecycle wired in `tests/setup.ts`. */
export const server = setupServer(...handlers);
