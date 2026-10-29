'use client';

import { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import type { JSX } from 'react';
import { createBrowserSupabaseClient, isSupabaseConfigured } from '@/lib/supabase/client';
import type { SupabaseClient } from '@supabase/supabase-js';
import { toAuthUser, type AuthUser } from '@/features/auth/api/auth';
import { useOnboardingStore } from '@/stores/onboardingStore';

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

export function AuthProvider({ children }: { children: React.ReactNode }): JSX.Element {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [status, setStatus] = useState<'loading' | 'authenticated' | 'unauthenticated'>(
    // Without Supabase env (local/dev, CI) the app runs in public mode from the start —
    // deriving the initial state avoids a synchronous setState during the effect.
    isSupabaseConfigured() ? 'loading' : 'unauthenticated'
  );

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      return;
    }

    const supabase = createBrowserSupabaseClient();

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
    // profile-flow/spec.md: "Cierre de sesión limpia también el estado de onboardingStore
    // para evitar fugas de estado entre sesiones de usuarios distintos en el mismo
    // navegador." Cleared unconditionally — this must happen regardless of whether a
    // Supabase session existed, since it's about *this browser*, not the remote session.
    useOnboardingStore.getState().reset();

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
