import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ThemeProvider } from 'next-themes';
import LoginPage from '@/app/login/page';
import SignupPage from '@/app/signup/page';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => ({ get: vi.fn(() => '/wardrobe') }),
  usePathname: () => '/login',
}));

vi.mock('@/lib/supabase/client', () => ({
  isSupabaseConfigured: () => true,
  createBrowserSupabaseClient: () => ({
    auth: {
      signUp: vi.fn(),
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
      getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
      onAuthStateChange: vi
        .fn()
        .mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
    },
  }),
}));

function renderWithTheme(ui: React.ReactElement): void {
  render(<ThemeProvider attribute="class">{ui}</ThemeProvider>);
}

describe('Auth Pages Full-Screen Layout', () => {
  it('renders LoginPage with full-screen editorial presentation and form', () => {
    renderWithTheme(<LoginPage />);

    // Main headings
    expect(screen.getByRole('heading', { level: 1, name: /iniciar sesión/i })).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 2, name: /tu armario personal/i })
    ).toBeInTheDocument();

    // Segmented tab navigation
    expect(screen.getByRole('tab', { name: /iniciar sesión/i })).toHaveAttribute(
      'aria-selected',
      'true'
    );
    expect(screen.getByRole('tab', { name: /crear cuenta/i })).toHaveAttribute(
      'aria-selected',
      'false'
    );

    // Bento features
    expect(screen.getByText(/corte de fondo/i)).toBeInTheDocument();
    expect(screen.getByText(/armonía de color/i)).toBeInTheDocument();
    expect(screen.getByText(/prueba por capas/i)).toBeInTheDocument();

    // Form inputs for login (Email and Password, NO name field)
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/contraseña/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/nombre/i)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /iniciar sesión/i })).toBeInTheDocument();
  });

  it('renders SignupPage with full-screen editorial presentation and signup fields', () => {
    renderWithTheme(<SignupPage />);

    // Main headings
    expect(screen.getByRole('heading', { level: 1, name: /crear cuenta/i })).toBeInTheDocument();

    // Segmented tab navigation
    expect(screen.getByRole('tab', { name: /crear cuenta/i })).toHaveAttribute(
      'aria-selected',
      'true'
    );
    expect(screen.getByRole('tab', { name: /iniciar sesión/i })).toHaveAttribute(
      'aria-selected',
      'false'
    );

    // Form inputs for signup (Name, Email, Password)
    expect(screen.getByLabelText(/nombre/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/contraseña/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /crear cuenta/i })).toBeInTheDocument();
  });
});
