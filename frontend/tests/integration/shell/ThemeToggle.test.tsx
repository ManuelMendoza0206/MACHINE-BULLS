import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from 'next-themes';
import { describe, it, expect, beforeEach } from 'vitest';
import { ThemeToggle } from '@/components/shell/ThemeToggle';

// design-system/spec.md — Requirement "Theme switching without FOUC".
function renderToggle(): void {
  render(
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <ThemeToggle />
    </ThemeProvider>
  );
}

describe('ThemeToggle', () => {
  beforeEach(() => {
    document.documentElement.className = '';
    window.localStorage.clear();
  });

  it('exposes an accessible label', async () => {
    renderToggle();
    expect(await screen.findByRole('button', { name: /tema:/i })).toBeInTheDocument();
  });

  it('cycles system → light → dark and updates <html> + localStorage', async () => {
    const user = userEvent.setup();
    renderToggle();
    const button = await screen.findByRole('button', { name: /tema:/i });

    await user.click(button); // → light
    expect(document.documentElement).toHaveClass('light');
    expect(window.localStorage.getItem('theme')).toBe('light');

    await user.click(button); // → dark
    expect(document.documentElement).toHaveClass('dark');
    expect(window.localStorage.getItem('theme')).toBe('dark');

    await user.click(button); // → system
    expect(window.localStorage.getItem('theme')).toBe('system');
  });

  it('reflects the persisted preference on mount', async () => {
    window.localStorage.setItem('theme', 'dark');
    renderToggle();
    expect(await screen.findByRole('button', { name: /tema: oscuro/i })).toBeInTheDocument();
  });
});
