import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSignUp = vi.fn();
const mockSignIn = vi.fn();
const mockSignOut = vi.fn();

vi.mock('@/lib/supabase/client', () => ({
  createBrowserSupabaseClient: () => ({
    auth: {
      signUp: mockSignUp,
      signInWithPassword: mockSignIn,
      signOut: mockSignOut,
    },
  }),
}));

import { signInWithEmail, signOut, signUpWithEmail } from '@/features/auth/api/auth';
import { ApiError } from '@/lib/errors';

describe('auth api — Supabase error mapping', () => {
  beforeEach(() => vi.clearAllMocks());

  it('signUp maps user_already_exists to 422', async () => {
    mockSignUp.mockResolvedValue({
      data: { user: null },
      error: { message: 'User already registered', code: 'user_already_exists' },
    });
    await expect(
      signUpWithEmail({ name: 'Ana', email: 'a@b.com', password: 'password123' })
    ).rejects.toBeInstanceOf(ApiError);
    await expect(
      signUpWithEmail({ name: 'Ana', email: 'a@b.com', password: 'password123' })
    ).rejects.toMatchObject({ status: 422 });
  });

  it('signIn maps invalid_credentials to 401 generic', async () => {
    mockSignIn.mockResolvedValue({
      data: { user: null },
      error: { message: 'Invalid login credentials', code: 'invalid_credentials' },
    });
    await expect(signInWithEmail({ email: 'a@b.com', password: 'x' })).rejects.toMatchObject({
      status: 401,
      message: 'Email o contraseña incorrectos.',
    });
  });

  it('maps email not confirmed to 403', async () => {
    mockSignIn.mockResolvedValue({
      data: { user: null },
      error: { message: 'Email not confirmed' },
    });
    await expect(signInWithEmail({ email: 'a@b.com', password: 'x' })).rejects.toMatchObject({
      status: 403,
    });
  });

  it('maps generic error to 400', async () => {
    mockSignIn.mockResolvedValue({ data: { user: null }, error: { message: 'Something else' } });
    await expect(signInWithEmail({ email: 'a@b.com', password: 'x' })).rejects.toMatchObject({
      status: 400,
    });
  });

  it('signOut maps error to ApiError', async () => {
    mockSignOut.mockResolvedValue({ error: { message: 'fail' } });
    await expect(signOut()).rejects.toBeInstanceOf(ApiError);
  });

  it('signOut succeeds when no error', async () => {
    mockSignOut.mockResolvedValue({ error: null });
    await expect(signOut()).resolves.toBeUndefined();
  });

  it('signIn throws when data.user is null without error (edge)', async () => {
    mockSignIn.mockResolvedValue({ data: { user: null }, error: null });
    await expect(signInWithEmail({ email: 'a@b.com', password: 'x' })).rejects.toMatchObject({
      status: 401,
    });
  });
});
