'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { LoginFormSchema, SignupFormSchema, type LoginForm, type SignupForm } from '@/schemas/auth';
import { signInWithEmail, signUpWithEmail, type AuthUser } from '@/features/auth/api/auth';
import { ApiError } from '@/lib/errors';

interface AuthFormProps {
  mode: 'login' | 'signup';
  onSuccess: (user: AuthUser) => void;
}

export function AuthForm({ mode, onSuccess }: AuthFormProps): JSX.Element {
  const [serverError, setServerError] = useState<string | null>(null);

  const isSignup = mode === 'signup';

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignupForm>({
    resolver: zodResolver(isSignup ? SignupFormSchema : LoginFormSchema) as never,
    defaultValues: isSignup
      ? { name: '', email: '', password: '' }
      : ({ email: '', password: '' } as never),
  });

  // Narrowed for name field (only in signup)
  const nameError = (errors as unknown as { name?: { message?: string } }).name;

  const onSubmit = async (data: SignupForm | LoginForm): Promise<void> => {
    setServerError(null);
    try {
      const user = isSignup
        ? await signUpWithEmail(data as SignupForm)
        : await signInWithEmail(data as LoginForm);
      onSuccess(user);
    } catch (err) {
      if (err instanceof ApiError) {
        setServerError(err.message);
      } else if (err instanceof Error) {
        setServerError(err.message);
      } else {
        setServerError('Ocurrió un error inesperado.');
      }
    }
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      className="flex flex-col gap-4"
      aria-label={mode === 'login' ? 'Formulario de login' : 'Formulario de registro'}
    >
      {isSignup && (
        <div className="flex flex-col gap-1">
          <label htmlFor="name" className="text-sm font-medium">
            Nombre
          </label>
          <input
            id="name"
            type="text"
            autoComplete="name"
            className="rounded-md border px-3 py-2"
            aria-invalid={Boolean(nameError)}
            aria-describedby={nameError ? 'name-error' : undefined}
            {...register('name' as const)}
          />
          {nameError && (
            <p id="name-error" className="text-sm text-destructive">
              {nameError.message}
            </p>
          )}
        </div>
      )}

      <div className="flex flex-col gap-1">
        <label htmlFor="email" className="text-sm font-medium">
          Email
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          className="rounded-md border px-3 py-2"
          aria-invalid={Boolean(errors.email)}
          aria-describedby={errors.email ? 'email-error' : undefined}
          {...register('email')}
        />
        {errors.email && (
          <p id="email-error" className="text-sm text-destructive">
            {errors.email.message}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="password" className="text-sm font-medium">
          Contraseña
        </label>
        <input
          id="password"
          type="password"
          autoComplete={isSignup ? 'new-password' : 'current-password'}
          className="rounded-md border px-3 py-2"
          aria-invalid={Boolean(errors.password)}
          aria-describedby={errors.password ? 'password-error' : undefined}
          {...register('password')}
        />
        {errors.password && (
          <p id="password-error" className="text-sm text-destructive">
            {errors.password.message}
          </p>
        )}
      </div>

      {serverError && (
        <p role="alert" className="text-sm text-destructive">
          {serverError}
        </p>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        aria-disabled={isSubmitting}
        className="rounded-md bg-primary px-4 py-2 font-medium text-primary-foreground disabled:opacity-50"
      >
        {isSubmitting ? 'Cargando...' : isSignup ? 'Crear cuenta' : 'Iniciar sesión'}
      </button>
    </form>
  );
}
