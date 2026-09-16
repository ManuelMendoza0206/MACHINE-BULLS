import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { NAV_ITEMS } from '@/config/navigation';

const usePathname = vi.fn(() => '/outfits');
vi.mock('next/navigation', () => ({ usePathname: () => usePathname() }));

const { BottomTabBar } = await import('@/components/shell/BottomTabBar');

describe('BottomTabBar', () => {
  it('renders the 4 NAV_ITEMS and is hidden at lg via CSS only', () => {
    render(<BottomTabBar />);
    const nav = screen.getByRole('navigation', { name: /Navegación principal/ });
    expect(nav.className).toContain('lg:hidden'); // no viewport JS
    expect(screen.getAllByRole('link')).toHaveLength(NAV_ITEMS.length);
  });

  it('sets aria-current on the active tab only', () => {
    usePathname.mockReturnValue('/outfits');
    render(<BottomTabBar />);
    expect(screen.getByRole('link', { name: /Outfits/ })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: /Perfil/ })).not.toHaveAttribute('aria-current');
  });
});
