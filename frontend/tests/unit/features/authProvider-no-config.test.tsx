import type { JSX } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { AuthProvider } from '@/features/auth/components/AuthProvider';
import { useOnboardingStore } from '@/stores/onboardingStore';

// Supabase sin configurar (local/CI sin env vars): el cliente lanza al crearse.
vi.mock('@/lib/supabase/client', () => ({
  isSupabaseConfigured: () => false,
  createBrowserSupabaseClient: () => {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be defined.');
  },
}));

describe('AuthProvider sin configuración de Supabase', () => {
  function Probe(): JSX.Element {
    const { status, user, signOut } = useAuth();
    return (
      <div>
        {status}:{user?.email ?? 'none'}
        <button onClick={() => void signOut()}>signOut</button>
      </div>
    );
  }

  it('arranca como unauthenticated sin crashear', async () => {
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>
    );
    await waitFor(() => expect(screen.getByText(/unauthenticated:none/)).toBeInTheDocument());
  });

  it('signOut es un no-op seguro sin cliente', async () => {
    const user = userEvent.setup();
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>
    );
    await waitFor(() => expect(screen.getByText(/unauthenticated:none/)).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: 'signOut' }));
    expect(screen.getByText(/unauthenticated:none/)).toBeInTheDocument();
  });

  it('signOut limpia onboardingStore (profile-flow/spec.md: evita fugas de estado entre usuarios)', async () => {
    const user = userEvent.setup();
    useOnboardingStore.getState().setStep(2);
    useOnboardingStore.getState().setTargetAesthetic('streetwear');
    useOnboardingStore.getState().toggleCapsuleGarment('g1');

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>
    );
    await waitFor(() => expect(screen.getByText(/unauthenticated:none/)).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: 'signOut' }));

    const state = useOnboardingStore.getState();
    expect(state.step).toBe(1);
    expect(state.targetAesthetic).toBeNull();
    expect(state.selectedCapsuleGarmentIds).toEqual([]);
  });
});
