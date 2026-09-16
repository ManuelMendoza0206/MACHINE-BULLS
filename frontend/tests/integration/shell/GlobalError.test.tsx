import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import GlobalError from '@/app/error';
import { ApiError, NetworkError, ValidationError, VtonJobTimeoutError } from '@/lib/errors';

describe('GlobalError', () => {
  beforeEach(() => vi.spyOn(console, 'error').mockImplementation(() => {}));
  afterEach(() => vi.restoreAllMocks());

  const cases: [Error, string][] = [
    [new ApiError('boom', 500), 'Hubo un problema con el servidor. Inténtalo de nuevo.'],
    [new NetworkError('offline'), 'No pudimos conectarnos. Revisa tu conexión.'],
    [new ValidationError('bad', []), 'Recibimos una respuesta inesperada del servidor.'],
    [new Error('unknown'), 'Algo salió mal.'],
    [new VtonJobTimeoutError('slow', 'job-1'), 'Algo salió mal.'], // falls through to generic
  ];

  it.each(cases)('shows the right copy for %s', (error, copy) => {
    render(<GlobalError error={error} reset={() => {}} />);
    expect(screen.getByRole('heading', { name: copy })).toBeInTheDocument();
  });

  it('never leaks technical detail into the UI for ValidationError', () => {
    render(
      <GlobalError error={new ValidationError('field x expected string', [])} reset={() => {}} />
    );
    expect(screen.queryByText(/field x expected string/)).not.toBeInTheDocument();
  });

  it('calls reset exactly once on "Reintentar"', async () => {
    const reset = vi.fn();
    render(<GlobalError error={new Error('x')} reset={reset} />);
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(reset).toHaveBeenCalledTimes(1);
  });
});
