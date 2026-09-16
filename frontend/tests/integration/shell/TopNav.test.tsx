import { render, screen } from '@testing-library/react';
import { ThemeProvider } from 'next-themes';
import { describe, it, expect, vi } from 'vitest';
import { NAV_ITEMS } from '@/config/navigation';

const usePathname = vi.fn(() => '/wardrobe');
vi.mock('next/navigation', () => ({ usePathname: () => usePathname() }));

// Imported after the mock is registered.
const { TopNav } = await import('@/components/shell/TopNav');

function renderNav(): void {
  render(
    <ThemeProvider attribute="class">
      <TopNav />
    </ThemeProvider>
  );
}

describe('TopNav', () => {
  it('renders exactly the 4 NAV_ITEMS', () => {
    renderNav();
    for (const item of NAV_ITEMS) {
      expect(screen.getByRole('link', { name: new RegExp(item.label) })).toBeInTheDocument();
    }
  });

  it('marks the item for the current path with aria-current and a non-colour signal', () => {
    usePathname.mockReturnValue('/wardrobe/upload');
    renderNav();
    const active = screen.getByRole('link', { name: /Armario/ });
    expect(active).toHaveAttribute('aria-current', 'page');
    expect(active.className).toContain('font-semibold');

    const inactive = screen.getByRole('link', { name: /Outfits/ });
    expect(inactive).not.toHaveAttribute('aria-current');
  });
});
