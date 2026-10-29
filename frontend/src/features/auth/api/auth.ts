import { ApiError } from '@/lib/errors';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';
import type { LoginForm, SignupForm } from '@/schemas/auth';

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  /** ISO date string — Supabase's `created_at`. Used by profile-flow's `ProfileHeader`. */
  createdAt: string;
}

function mapSupabaseError(error: { message: string; code?: string }): never {
  const msg = error.message ?? '';

  // Never expose raw Supabase code distinction between "user not found" vs "invalid password"
  if (
    msg.toLowerCase().includes('invalid login credentials') ||
    error.code === 'invalid_credentials'
  ) {
    throw new ApiError('Email o contraseña incorrectos.', 401, {
      detail: 'Email o contraseña incorrectos.',
    });
  }

  if (
    msg.toLowerCase().includes('user already registered') ||
    msg.toLowerCase().includes('already registered') ||
    error.code === 'user_already_exists'
  ) {
    throw new ApiError('Este email ya está registrado.', 422, {
      detail: 'Este email ya está registrado.',
    });
  }

  if (msg.toLowerCase().includes('email not confirmed')) {
    throw new ApiError('Debes confirmar tu email antes de iniciar sesión.', 403, {
      detail: 'Debes confirmar tu email.',
    });
  }

  // Fallback — always ApiError, never raw Supabase error
  throw new ApiError(msg || 'Error de autenticación.', 400, {
    detail: msg || 'Error de autenticación.',
  });
}

/** Shared by `AuthProvider` (session hydration) and the signUp/signIn calls below — the one
 * place that maps a raw Supabase user to this app's `AuthUser`. */
export function toAuthUser(supabaseUser: {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, unknown>;
  created_at?: string;
}): AuthUser {
  return {
    id: supabaseUser.id,
    email: supabaseUser.email ?? '',
    name: (supabaseUser.user_metadata?.['name'] as string | undefined) ?? null,
    createdAt: supabaseUser.created_at ?? new Date(0).toISOString(),
  };
}

export async function signUpWithEmail(form: SignupForm): Promise<AuthUser> {
  const supabase = createBrowserSupabaseClient();
  const { data, error } = await supabase.auth.signUp({
    email: form.email,
    password: form.password,
    options: { data: { name: form.name } },
  });

  if (error) mapSupabaseError(error);
  if (!data.user) throw new ApiError('No se pudo crear el usuario.', 500);

  return toAuthUser(data.user);
}

export async function signInWithEmail(form: LoginForm): Promise<AuthUser> {
  const supabase = createBrowserSupabaseClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: form.email,
    password: form.password,
  });

  if (error) mapSupabaseError(error);
  if (!data.user) throw new ApiError('Email o contraseña incorrectos.', 401);

  return toAuthUser(data.user);
}

export async function signOut(): Promise<void> {
  const supabase = createBrowserSupabaseClient();
  const { error } = await supabase.auth.signOut();
  if (error) mapSupabaseError(error);
}
