import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Skeleton } from '@/components/ui/skeleton';

describe('Skeleton', () => {
  it('signals a loading state to assistive tech', () => {
    render(<Skeleton className="h-12 w-full" />);
    const el = screen.getByRole('status');
    expect(el).toHaveAttribute('aria-busy', 'true');
    expect(el).toHaveAccessibleName('Cargando');
  });

  it('accepts a custom label and merges className', () => {
    render(<Skeleton label="Cargando prendas" className="h-4" />);
    const el = screen.getByRole('status');
    expect(el).toHaveAccessibleName('Cargando prendas');
    expect(el.className).toContain('animate-pulse');
    expect(el.className).toContain('h-4');
  });
});
