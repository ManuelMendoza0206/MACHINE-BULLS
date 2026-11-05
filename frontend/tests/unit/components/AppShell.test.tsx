import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ThemeProvider } from 'next-themes';
import { AppShell } from '@/components/shell/AppShell';

const usePathname = vi.fn(() => '/wardrobe');
vi.mock('next/navigation', () => ({
  usePathname: () => usePathname(),
}));

function renderShell(children: React.ReactNode = <div>Contenido de prueba</div>): void {
  render(
    <ThemeProvider attribute="class">
      <AppShell>{children}</AppShell>
    </ThemeProvider>
  );
}

describe('AppShell', () => {
  it('renders TopNav and BottomTabBar on standard routes like /wardrobe', () => {
    usePathname.mockReturnValue('/wardrobe');
    renderShell();

    // TopNav and BottomTabBar are present
    expect(screen.getAllByRole('navigation', { name: /Navegación principal/i })).toHaveLength(2);
    // Content is rendered
    expect(screen.getByText('Contenido de prueba')).toBeInTheDocument();
    // Main element has pb-24 class
    const main = screen.getByRole('main');
    expect(main.className).toContain('pb-24');
  });

  it('hides TopNav and BottomTabBar on /login and removes bottom padding', () => {
    usePathname.mockReturnValue('/login');
    renderShell();

    // Navigation elements are NOT in the document
    expect(
      screen.queryByRole('navigation', { name: /Navegación principal/i })
    ).not.toBeInTheDocument();
    expect(screen.getByText('Contenido de prueba')).toBeInTheDocument();

    const main = screen.getByRole('main');
    expect(main.className).not.toContain('pb-24');
    expect(main.className).toContain('w-full');
  });

  it('hides TopNav and BottomTabBar on /signup and removes bottom padding', () => {
    usePathname.mockReturnValue('/signup');
    renderShell();

    expect(
      screen.queryByRole('navigation', { name: /Navegación principal/i })
    ).not.toBeInTheDocument();
    expect(screen.getByText('Contenido de prueba')).toBeInTheDocument();

    const main = screen.getByRole('main');
    expect(main.className).not.toContain('pb-24');
  });
});
