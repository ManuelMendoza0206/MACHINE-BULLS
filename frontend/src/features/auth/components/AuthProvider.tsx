'use client';

import { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { AuthUser } from '@/features/auth/api/auth';

export interface AuthContextValue {
  user: AuthUser | null;
  status: 'loading' | 'authenticated' | 'unauthenticated';
  signOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue>({
  user: null,
  status: 'loading',
  signOut: async () => {},
});

function toAuthUser(supabaseUser: {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, unknown>;
}): AuthUser {
  return {
    id: supabaseUser.id,
    email: supabaseUser.email ?? '',
    name: (supabaseUser.user_metadata?.['name'] as string | undefined) ?? null,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }): JSX.Element {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [status, setStatus] = useState<'loading' | 'authenticated' | 'unauthenticated'>('loading');

  useEffect(() => {
    let supabase: SupabaseClient;
    try {
      supabase = createBrowserSupabaseClient();
    } catch {
      // Supabase sin configurar (local/CI sin env vars): app arranca en modo público.
      setStatus('unauthenticated');
      return;
    }

    // Initial session
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUser(toAuthUser(data.user));
        setStatus('authenticated');
      } else {
        setUser(null);
        setStatus('unauthenticated');
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      const sbUser = session?.user ?? null;
      if (sbUser) {
        setUser(toAuthUser(sbUser));
        setStatus('authenticated');
      } else {
        setUser(null);
        setStatus('unauthenticated');
      }
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  const signOut = useCallback(async () => {
    let supabase: SupabaseClient;
    try {
      supabase = createBrowserSupabaseClient();
    } catch {
      setUser(null);
      setStatus('unauthenticated');
      return;
    }
    await supabase.auth.signOut();
    setUser(null);
    setStatus('unauthenticated');
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ user, status, signOut }),
    [user, status, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
