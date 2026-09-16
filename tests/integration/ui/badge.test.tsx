import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Badge } from '@/components/ui/badge';

describe('Badge', () => {
  it('renders each variant with its token classes', () => {
    const cases = [
      ['default', 'bg-accent'],
      ['success', 'bg-success'],
      ['warning', 'bg-warning'],
      ['outline', 'border-border'],
    ] as const;
    for (const [variant, cls] of cases) {
      const { unmount } = render(<Badge variant={variant}>{variant}</Badge>);
      expect(screen.getByText(variant).className).toContain(cls);
      unmount();
    }
  });

  it('carries its meaning in visible text, not colour alone', () => {
    render(<Badge variant="success">Activo</Badge>);
    // A screen-reader user gets the word "Activo", not just a green pill.
    expect(screen.getByText('Activo')).toBeVisible();
  });

  it('defaults to the default variant without a type error', () => {
    render(<Badge>plain</Badge>);
    expect(screen.getByText('plain').className).toContain('bg-accent');
  });
});
