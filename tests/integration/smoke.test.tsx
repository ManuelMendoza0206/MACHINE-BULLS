import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { SkipToContentLink } from '@/components/shell/SkipToContentLink';

/**
 * Scaffold smoke test: proves the toolchain end-to-end —
 * TSX compilation, jsdom, React Testing Library, and the `@/` path alias.
 * Real component/behaviour coverage arrives with Tarea 1+.
 */
describe('scaffold smoke', () => {
  it('renders a component and resolves the @/ alias', () => {
    render(<SkipToContentLink />);
    const link = screen.getByRole('link', { name: /saltar al contenido/i });
    expect(link).toHaveAttribute('href', '#main-content');
  });
});
