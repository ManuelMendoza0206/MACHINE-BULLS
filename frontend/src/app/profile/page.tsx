'use client';

import { useRouter } from 'next/navigation';
import { useEffect, type JSX } from 'react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useProfilePreferences } from '@/features/profile/hooks/useProfilePreferences';
import { ProfileHeader } from '@/features/profile/components/ProfileHeader';
import { DefaultAestheticSelector } from '@/features/profile/components/DefaultAestheticSelector';
import { SignOutButton } from '@/features/profile/components/SignOutButton';
import { ProfileView } from '@/features/profile/components/ProfileView';
import { KNOWN_AESTHETICS } from '@/config/aesthetics';

/**
 * profile-flow/spec.md §3.1. `proxy.ts` already protects this route, so the redirect below is
 * defensive only (direct client-side nav without a full reload, a stale session, etc.) — this
 * page never assumes it's the first line of defense.
 */
export default function ProfilePage(): JSX.Element {
  const { user, status } = useAuth();
  const router = useRouter();
  const { defaultAesthetic, setDefaultAesthetic } = useProfilePreferences();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  if (status !== 'authenticated' || !user) {
    return (
      <section className="mx-auto max-w-7xl space-y-6 p-8">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold">Perfil</h1>
          <p className="text-muted-foreground">Tu cuenta, tu armario y el estado del sistema.</p>
        </div>
        <div className="mt-6">
          <ProfileView />
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-7xl space-y-6 p-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">Perfil</h1>
        <p className="text-muted-foreground">Tu cuenta, tu armario y el estado del sistema.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <ProfileHeader
          name={user.name ?? user.email}
          email={user.email}
          createdAt={user.createdAt}
        />
        <DefaultAestheticSelector
          value={defaultAesthetic}
          onChange={setDefaultAesthetic}
          availableAesthetics={[...KNOWN_AESTHETICS]}
        />
      </div>

      <div className="mt-6">
        <ProfileView />
      </div>

      <div className="pt-2 flex justify-end">
        <SignOutButton />
      </div>
    </section>
  );
}
