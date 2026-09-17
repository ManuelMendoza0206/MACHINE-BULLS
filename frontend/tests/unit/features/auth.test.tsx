import type { JSX } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock Supabase client
const mockSignUp = vi.fn();
const mockSignIn = vi.fn();
const mockSignOut = vi.fn();
const mockGetUser = vi.fn();
const mockOnAuthStateChange = vi.fn();

vi.mock('@/lib/supabase/client', () => ({
  isSupabaseConfigured: () => true,
  createBrowserSupabaseClient: () => ({
    auth: {
      signUp: mockSignUp,
      signInWithPassword: mockSignIn,
      signOut: mockSignOut,
      getUser: mockGetUser,
      onAuthStateChange: mockOnAuthStateChange,
    },
  }),
}));

import { AuthForm } from '@/features/auth/components/AuthForm';
import { LandingCta } from '@/features/auth/components/LandingCta';
import { AuthProvider } from '@/features/auth/components/AuthProvider';
import { useAuth } from '@/features/auth/hooks/useAuth';

describe('AuthForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: null } });
    mockOnAuthStateChange.mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } });
  });

  it('signup: calls onSuccess on valid submit', async () => {
    const user = userEvent.setup();
    mockSignUp.mockResolvedValue({
      data: { user: { id: 'u1', email: 'a@b.com', user_metadata: { name: 'Ana' } } },
      error: null,
    });
    const onSuccess = vi.fn();

    render(<AuthForm mode="signup" onSuccess={onSuccess} />);

    await user.type(screen.getByLabelText(/nombre/i), 'Ana');
    await user.type(screen.getByLabelText(/email/i), 'a@b.com');
    await user.type(screen.getByLabelText(/contraseña/i), 'password123');
    await user.click(screen.getByRole('button', { name: /crear cuenta/i }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
  });

  it('signup: shows server error when email already registered, does not call onSuccess', async () => {
    const user = userEvent.setup();
    mockSignUp.mockResolvedValue({
      data: { user: null },
      error: { message: 'User already registered', code: 'user_already_exists' },
    });
    const onSuccess = vi.fn();

    render(<AuthForm mode="signup" onSuccess={onSuccess} />);

    await user.type(screen.getByLabelText(/nombre/i), 'Ana');
    await user.type(screen.getByLabelText(/email/i), 'a@b.com');
    await user.type(screen.getByLabelText(/contraseña/i), 'password123');
    await user.click(screen.getByRole('button', { name: /crear cuenta/i }));

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('login: shows generic error without distinguishing field', async () => {
    const user = userEvent.setup();
    mockSignIn.mockResolvedValue({
      data: { user: null },
      error: { message: 'Invalid login credentials', code: 'invalid_credentials' },
    });
    const onSuccess = vi.fn();

    render(<AuthForm mode="login" onSuccess={onSuccess} />);

    await user.type(screen.getByLabelText(/email/i), 'a@b.com');
    await user.type(screen.getByLabelText(/contraseña/i), 'wrong');
    await user.click(screen.getByRole('button', { name: /iniciar sesión/i }));

    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toBe('Email o contraseña incorrectos.');
    // Ensure message does NOT leak which field failed
    expect(alert.textContent).not.toMatch(/email no existe/i);
    expect(alert.textContent).not.toMatch(/contraseña incorrecta/i);
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('disables submit during pending (prevents double submit)', async () => {
    const user = userEvent.setup();
    let resolve: (v: unknown) => void = () => {};
    mockSignIn.mockReturnValue(
      new Promise(r => {
        resolve = r as never;
      })
    );

    render(<AuthForm mode="login" onSuccess={vi.fn()} />);

    await user.type(screen.getByLabelText(/email/i), 'a@b.com');
    await user.type(screen.getByLabelText(/contraseña/i), 'x');
    await user.click(screen.getByRole('button', { name: /iniciar sesión/i }));

    expect(screen.getByRole('button', { name: /cargando/i })).toBeDisabled();

    // cleanup
    resolve({ data: { user: { id: 'u1', email: 'a@b.com', user_metadata: {} } }, error: null });
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /iniciar sesión/i })).toBeEnabled()
    );
  });
});

describe('LandingCta', () => {
  it('defaults to /signup when unauthenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    mockOnAuthStateChange.mockImplementation((cb: (event: string, session: unknown) => void) => {
      // No session
      setTimeout(() => cb('SIGNED_OUT', null), 0);
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    });

    render(
      <AuthProvider>
        <LandingCta />
      </AuthProvider>
    );

    // Initially loading -> defaults to /signup per spec §3.4
    expect(screen.getByRole('link', { name: /empezar/i })).toHaveAttribute('href', '/signup');
  });
});

describe('useAuth transitions', () => {
  it('loading -> authenticated', async () => {
    const fakeUser = { id: 'u1', email: 'a@b.com', user_metadata: { name: 'Ana' } };
    mockGetUser.mockResolvedValue({ data: { user: fakeUser } });
    mockOnAuthStateChange.mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } });

    function Probe(): JSX.Element {
      const { status, user } = useAuth();
      return (
        <div>
          {status}:{user?.email ?? 'none'}
        </div>
      );
    }

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>
    );

    await waitFor(() => expect(screen.getByText(/authenticated:a@b.com/)).toBeInTheDocument());
  });
});
