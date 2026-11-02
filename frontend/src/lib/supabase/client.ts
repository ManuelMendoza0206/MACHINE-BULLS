import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

let browserClient: SupabaseClient | null = null;

function getPublishableKey(): string | undefined {
  return (
    process.env['NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'] ||
    process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY']
  );
}

/** True when the Supabase browser env is configured (the client factory would succeed). */
export function isSupabaseConfigured(): boolean {
  return Boolean(process.env['NEXT_PUBLIC_SUPABASE_URL'] && getPublishableKey());
}

export function createBrowserSupabaseClient(): SupabaseClient {
  if (browserClient) return browserClient;

  const url = process.env['NEXT_PUBLIC_SUPABASE_URL'];
  const publishableKey = getPublishableKey();

  if (!url || !publishableKey) {
    throw new Error(
      'NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY) must be defined. See .env.example.'
    );
  }

  browserClient = createBrowserClient(url, publishableKey);
  return browserClient;
}
