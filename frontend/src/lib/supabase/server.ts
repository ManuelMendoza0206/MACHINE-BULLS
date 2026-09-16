import { createServerClient, type CookieOptions } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { ReadonlyRequestCookies } from 'next/dist/server/web/spec-extension/adapters/request-cookies';

// Minimal cookie store interface compatible with both next/headers cookies() and middleware cookie store
export interface CookieStore {
  get(name: string): { value: string } | undefined;
  getAll(): { name: string; value: string }[];
  set(name: string, value: string, options: CookieOptions): void;
}

export function createServerSupabaseClient(
  cookieStore: ReadonlyRequestCookies | CookieStore
): SupabaseClient {
  const url = process.env['NEXT_PUBLIC_SUPABASE_URL'];
  const anonKey = process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY'];

  if (!url || !anonKey) {
    throw new Error(
      'NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be defined. See .env.example.'
    );
  }

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        // ReadonlyRequestCookies has getAll, our CookieStore also
        if ('getAll' in cookieStore && typeof cookieStore.getAll === 'function') {
          return cookieStore.getAll();
        }
        return [];
      },
      setAll(cookiesToSet) {
        // Only attempt to set if the store supports set (middleware). In RSC, cookies() is readonly — ignore.
        if ('set' in cookieStore && typeof (cookieStore as CookieStore).set === 'function') {
          cookiesToSet.forEach(({ name, value, options }) => {
            (cookieStore as CookieStore).set(name, value, options);
          });
        }
      },
    },
  });
}
