import '@testing-library/jest-dom/vitest';
import { afterAll, afterEach, beforeAll, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import { server } from './fixtures/msw/server';

// MSW — intercepts real `fetch` calls; tests that instead do `vi.stubGlobal('fetch', ...)`
// bypass it entirely (existing convention, e.g. tests/unit/lib/api/client.test.ts), so this is
// additive infra, not a replacement for that pattern.
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

// Node >=22 exposes an experimental global `localStorage` that can leave jsdom's
// `window.localStorage` undefined in some runtimes. Provide a tiny in-memory shim
// so the per-test cleanup below and any direct access never throw.
if (typeof window.localStorage === 'undefined') {
  const store = new Map<string, string>();
  const shim: Storage = {
    get length() {
      return store.size;
    },
    clear: () => store.clear(),
    getItem: (key: string) => store.get(key) ?? null,
    key: (index: number) => [...store.keys()][index] ?? null,
    removeItem: (key: string) => void store.delete(key),
    setItem: (key: string, value: string) => void store.set(key, value),
  };
  Object.defineProperty(window, 'localStorage', { value: shim, configurable: true });
}

// AppProviders mounts AuthProvider (Supabase) since the monorepo merge. Give every
// test a harmless default client; auth-focused suites override it with their own mocks.
vi.mock('@/lib/supabase/client', () => ({
  isSupabaseConfigured: () => true,
  createBrowserSupabaseClient: () => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      onAuthStateChange: vi.fn().mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
    },
  }),
}));

// Unmount React trees rendered by RTL after every test to avoid cross-test leakage.
afterEach(() => {
  cleanup();
  window.localStorage.clear();
});

// jsdom ships no matchMedia — next-themes and responsive code rely on it.
if (!window.matchMedia) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}
