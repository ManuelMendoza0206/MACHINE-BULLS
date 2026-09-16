import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { AuthProvider } from '@/features/auth/components/AuthProvider';

// Supabase sin configurar (local/CI sin env vars): el cliente lanza al crearse.
vi.mock('@/lib/supabase/client', () => ({
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
});
