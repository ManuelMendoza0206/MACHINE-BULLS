import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { Button } from '@/components/ui/button';

describe('Button', () => {
  it('renders every variant and size without error', () => {
    for (const variant of ['default', 'secondary', 'ghost', 'destructive'] as const) {
      for (const size of ['sm', 'default', 'lg', 'icon'] as const) {
        const { unmount } = render(
          <Button variant={variant} size={size}>
            {variant}-{size}
          </Button>
        );
        expect(screen.getByRole('button')).toBeInTheDocument();
        unmount();
      }
    }
  });

  it('applies token classes for the destructive variant', () => {
    render(<Button variant="destructive">Borrar</Button>);
    expect(screen.getByRole('button').className).toContain('bg-destructive');
  });

  it('exposes aria-disabled and native disabled when disabled', () => {
    render(<Button disabled>Enviar</Button>);
    const btn = screen.getByRole('button');
    expect(btn).toBeDisabled();
    expect(btn).toHaveAttribute('aria-disabled', 'true');
  });

  it('does not fire onClick when disabled', async () => {
    const onClick = vi.fn();
    render(
      <Button disabled onClick={onClick}>
        Enviar
      </Button>
    );
    await userEvent.click(screen.getByRole('button'));
    expect(onClick).not.toHaveBeenCalled();
  });

  it('forwards the ref and renders as child with asChild', () => {
    const ref = createRef<HTMLButtonElement>();
    render(
      <Button ref={ref}>
        <span>ok</span>
      </Button>
    );
    expect(ref.current).toBeInstanceOf(HTMLButtonElement);

    render(
      <Button asChild>
        <a href="/x">link</a>
      </Button>
    );
    const link = screen.getByRole('link', { name: 'link' });
    expect(link.className).toContain('inline-flex');
  });
});
