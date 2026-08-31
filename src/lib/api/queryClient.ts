import type { QueryClientConfig } from '@tanstack/react-query';

/**
 * TanStack Query defaults, shared by `AppProviders` (which wraps this in a per-session
 * `useState(() => new QueryClient(...))`) and by the API-client layer (spec 01).
 *
 * `retry: false` — the HTTP client owns retry policy per endpoint (polling has its own
 * back-off in the VTON flow); a blanket auto-retry would hide real failures.
 */
export const defaultQueryClientConfig: QueryClientConfig = {
  defaultOptions: {
    queries: { retry: false, staleTime: 30_000 },
    mutations: { retry: false },
  },
};
