import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Progress } from '@/components/ui/progress';

describe('Progress', () => {
  it('is a progressbar with aria-valuenow when determinate', () => {
    render(<Progress value={65} />);
    const bar = screen.getByRole('progressbar');
    expect(bar).toHaveAttribute('aria-valuenow', '65');
    expect(bar).toHaveAttribute('aria-valuetext', '65%');
    expect(bar).toHaveAttribute('aria-valuemin', '0');
    expect(bar).toHaveAttribute('aria-valuemax', '100');
  });

  it('clamps out-of-range values', () => {
    render(<Progress value={140} />);
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100');
  });

  it('uses aria-valuetext and no aria-valuenow when indeterminate', () => {
    render(<Progress indeterminateLabel="Analizando tu pose" />);
    const bar = screen.getByRole('progressbar');
    expect(bar).not.toHaveAttribute('aria-valuenow');
    expect(bar).toHaveAttribute('aria-valuetext', 'Analizando tu pose');
  });
});
