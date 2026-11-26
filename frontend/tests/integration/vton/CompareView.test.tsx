import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CompareView } from '@/features/vton/components/CompareView';

describe('CompareView', () => {
  it('reveals two results with an accessible comparison slider', () => {
    render(
      <CompareView
        originalUrl="https://images.test/look-a.webp"
        comparisonUrl="https://images.test/look-b.webp"
        originalLabel="Outfit original"
        comparisonLabel="Outfit alternativo"
      />
    );

    expect(screen.getByRole('img', { name: 'Outfit original' })).toBeVisible();
    expect(screen.getByRole('img', { name: 'Outfit alternativo' })).toBeVisible();
    const slider = screen.getByRole('slider', { name: 'Comparar resultados' });
    expect(slider).toHaveValue('50');
    fireEvent.change(slider, { target: { value: '70' } });
    expect(slider).toHaveValue('70');
    expect(screen.getByTestId('comparison-reveal')).toHaveStyle({ clipPath: 'inset(0 30% 0 0)' });
  });
});
