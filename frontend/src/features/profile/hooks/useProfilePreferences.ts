'use client';

import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/features/auth/hooks/useAuth';
import {
  getDefaultAesthetic,
  setDefaultAesthetic as persistDefaultAesthetic,
} from '@/features/profile/lib/profilePreferences';

export interface UseProfilePreferencesResult {
  defaultAesthetic: string | null;
  setDefaultAesthetic: (aesthetic: string | null) => void;
}

/**
 * `defaultAesthetic` is lazily seeded from `localStorage` on first render for the current
 * user — profile-flow/spec.md §3.1 (no network call; `/profile` only ever reads the session
 * already resolved by the shell). If `user` is `null` (shouldn't happen inside a protected
 * route, handled defensively per spec §2.2), reads report `null` and writes are a no-op that
 * warns in development instead of throwing.
 */
export function useProfilePreferences(): UseProfilePreferencesResult {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const [defaultAesthetic, setLocalDefaultAesthetic] = useState<string | null>(() =>
    userId ? getDefaultAesthetic(userId) : null
  );
  // Tracks which user the state above was read for, so a `userId` change re-seeds it. `user`
  // resolves asynchronously (spec §3.1: `/profile` only mounts this hook's consumers once
  // `useAuth()` settles to 'authenticated', but the hook stays defensive on its own) — a plain
  // `useState` lazy initializer only runs once, so without this the value would never update
  // if the id becomes available (or changes) after mount. Re-seeding directly in the render
  // body (React's documented pattern for "adjust state when a prop changes") avoids the extra
  // render-then-effect round trip a `useEffect` here would cost.
  const [seededFor, setSeededFor] = useState(userId);
  if (userId !== seededFor) {
    setSeededFor(userId);
    setLocalDefaultAesthetic(userId ? getDefaultAesthetic(userId) : null);
  }

  const setDefaultAesthetic = useCallback(
    (aesthetic: string | null) => {
      if (!userId) {
        if (process.env.NODE_ENV === 'development') {
          console.warn(
            'useProfilePreferences.setDefaultAesthetic called with no authenticated user — ignored.'
          );
        }
        return;
      }
      persistDefaultAesthetic(userId, aesthetic);
      setLocalDefaultAesthetic(aesthetic);
      toast.success('Preferencia guardada');
    },
    [userId]
  );

  return { defaultAesthetic, setDefaultAesthetic };
}
