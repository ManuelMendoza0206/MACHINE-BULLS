import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/card';

describe('Card', () => {
  it('composes header / content / footer and keeps content visible', () => {
    render(
      <Card>
        <CardHeader>Título</CardHeader>
        <CardContent>Cuerpo</CardContent>
        <CardFooter>Pie</CardFooter>
      </Card>
    );
    expect(screen.getByText('Título')).toBeInTheDocument();
    expect(screen.getByText('Cuerpo')).toBeInTheDocument();
    expect(screen.getByText('Pie')).toBeInTheDocument();
  });

  it('uses border and background tokens, and merges className', () => {
    render(
      <Card className="p-0" data-testid="card">
        x
      </Card>
    );
    const el = screen.getByTestId('card');
    expect(el.className).toContain('border-border');
    expect(el.className).toContain('bg-background');
    expect(el.className).toContain('p-0');
  });
});
