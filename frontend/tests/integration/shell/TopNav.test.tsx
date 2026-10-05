import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from 'next-themes';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NAV_ITEMS } from '@/config/navigation';

const usePathname = vi.fn(() => '/wardrobe');
vi.mock('next/navigation', () => ({ usePathname: () => usePathname() }));

// Mock Supabase client — the shell reads the session through AuthProvider, so the session is
// driven from here rather than mocking useAuth() (change add-shell-auth-state, D5).
const mockSignOut = vi.fn();
const mockGetUser = vi.fn();
const mockOnAuthStateChange = vi.fn();

vi.mock('@/lib/supabase/client', () => ({
  isSupabaseConfigured: () => true,
  createBrowserSupabaseClient: () => ({
    auth: {
      signOut: mockSignOut,
      getUser: mockGetUser,
      onAuthStateChange: mockOnAuthStateChange,
    },
  }),
}));

// Imported after the mocks are registered.
const { AuthProvider } = await import('@/features/auth/components/AuthProvider');
const { TopNav } = await import('@/components/shell/TopNav');

const SIN_SESION = { id: 'u1', email: 'ana@example.com', user_metadata: { name: 'Ana' } };

function renderNav(): void {
  render(
    <ThemeProvider attribute="class">
      <AuthProvider>
        <TopNav />
      </AuthProvider>
    </ThemeProvider>
  );
}

describe('TopNav', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    usePathname.mockReturnValue('/wardrobe');
    mockSignOut.mockResolvedValue({ error: null });
    mockOnAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    });
  });

  it('renders exactly the 4 NAV_ITEMS', () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    renderNav();
    for (const item of NAV_ITEMS) {
      expect(screen.getByRole('link', { name: new RegExp(item.label) })).toBeInTheDocument();
    }
  });

  it('marks the item for the current path with aria-current and a non-colour signal', () => {
    usePathname.mockReturnValue('/wardrobe/upload');
    mockGetUser.mockResolvedValue({ data: { user: null } });
    renderNav();
    const active = screen.getByRole('link', { name: /Armario/ });
    expect(active).toHaveAttribute('aria-current', 'page');
    expect(active.className).toContain('font-semibold');

    const inactive = screen.getByRole('link', { name: /Outfits/ });
    expect(inactive).not.toHaveAttribute('aria-current');
  });
});

describe('TopNav — estado de sesión', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    usePathname.mockReturnValue('/wardrobe');
    mockSignOut.mockResolvedValue({ error: null });
    mockOnAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    });
  });

  it('authenticated: muestra la identidad y cierra sesión invocando signOut()', async () => {
    const user = userEvent.setup();
    mockGetUser.mockResolvedValue({ data: { user: SIN_SESION } });

    renderNav();

    expect(await screen.findByText('Ana')).toBeInTheDocument();
    expect(screen.queryByText('ana@example.com')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /cerrar sesión/i }));

    expect(mockSignOut).toHaveBeenCalledTimes(1);
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /cerrar sesión/i })).not.toBeInTheDocument();
    });
  });

  it('authenticated sin name: cae al email en vez de renderizar cadena vacía', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'u2', email: 'sin-nombre@example.com', user_metadata: {} } },
    });

    renderNav();

    expect(await screen.findByText('sin-nombre@example.com')).toBeInTheDocument();
  });

  it('loading: no renderiza identidad ni control de sesión', () => {
    // Promise que nunca resuelve — la sesión sigue en curso.
    mockGetUser.mockReturnValue(new Promise(() => {}));

    renderNav();

    expect(screen.queryByRole('button', { name: /cerrar sesión/i })).not.toBeInTheDocument();
    expect(screen.queryByText('Ana')).not.toBeInTheDocument();
    // La navegación de 4 ítems sigue presente mientras carga.
    for (const item of NAV_ITEMS) {
      expect(screen.getByRole('link', { name: new RegExp(item.label) })).toBeInTheDocument();
    }
  });

  it('unauthenticated: no renderiza identidad ni control de sesión', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    renderNav();

    await waitFor(() => {
      expect(mockGetUser).toHaveBeenCalled();
    });
    expect(screen.queryByRole('button', { name: /cerrar sesión/i })).not.toBeInTheDocument();
    expect(screen.queryByText('Ana')).not.toBeInTheDocument();
  });
});
