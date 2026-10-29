import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SignOutButton } from '@/features/profile/components/SignOutButton';

const signOut = vi.fn().mockResolvedValue(undefined);
const push = vi.fn();

vi.mock('@/features/auth/hooks/useAuth', () => ({
  useAuth: () => ({ user: null, status: 'authenticated', signOut }),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
}));

describe('SignOutButton', () => {
  beforeEach(() => {
    signOut.mockClear();
    push.mockClear();
  });

  it('el clic inicial abre el diálogo y NO llama a signOut', () => {
    render(<SignOutButton />);

    fireEvent.click(screen.getByRole('button', { name: 'Cerrar sesión' }));

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(signOut).not.toHaveBeenCalled();
  });

  it('cancelar cierra el diálogo sin cerrar sesión', () => {
    render(<SignOutButton />);

    fireEvent.click(screen.getByRole('button', { name: 'Cerrar sesión' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(signOut).not.toHaveBeenCalled();
  });

  it('solo el botón Confirmar invoca signOut', async () => {
    render(<SignOutButton />);

    fireEvent.click(screen.getByRole('button', { name: 'Cerrar sesión' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }));

    await waitFor(() => expect(signOut).toHaveBeenCalledTimes(1));
  });

  it('navega a "/" después de cerrar sesión exitosamente', async () => {
    render(<SignOutButton />);

    fireEvent.click(screen.getByRole('button', { name: 'Cerrar sesión' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }));

    await waitFor(() => expect(push).toHaveBeenCalledWith('/'));
  });
});
