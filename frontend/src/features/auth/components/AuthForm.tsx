'use client';

import { useState } from 'react';
import type { JSX } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff, Lock, Mail, User, AlertCircle, ArrowRight, Loader2 } from 'lucide-react';
import { LoginFormSchema, SignupFormSchema, type LoginForm, type SignupForm } from '@/schemas/auth';
import { signInWithEmail, signUpWithEmail, type AuthUser } from '@/features/auth/api/auth';
import { ApiError } from '@/lib/errors';
import { toast } from '@/components/ui/sonner';

interface AuthFormProps {
  mode: 'login' | 'signup';
  onSuccess: (user: AuthUser) => void;
}

export function AuthForm({ mode, onSuccess }: AuthFormProps): JSX.Element {
  const [serverError, setServerError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

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
      toast.success(isSignup ? '¡Cuenta creada con éxito!' : '¡Bienvenido de vuelta!');
      onSuccess(user);
    } catch (err) {
      let msg = 'Ocurrió un error inesperado.';
      if (err instanceof ApiError) {
        msg = err.message;
      } else if (err instanceof Error) {
        msg = err.message;
      }
      setServerError(msg);
      toast.error(msg);
    }
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      className="flex flex-col gap-4 text-left"
      aria-label={mode === 'login' ? 'Formulario de login' : 'Formulario de registro'}
    >
      {isSignup && (
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="name"
            className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
          >
            Nombre
          </label>
          <div className="relative flex items-center">
            <span
              className="pointer-events-none absolute left-3.5 text-muted-foreground/60"
              aria-hidden="true"
            >
              <User className="h-4 w-4" />
            </span>
            <input
              id="name"
              type="text"
              autoComplete="name"
              placeholder="Tu nombre o alias"
              className="w-full rounded-xl border border-input bg-background/80 pl-10 pr-3.5 py-2.5 text-sm transition-all focus:border-accent focus:bg-background focus:ring-2 focus:ring-accent/20 focus:outline-none"
              aria-invalid={Boolean(nameError)}
              aria-describedby={nameError ? 'name-error' : undefined}
              {...register('name' as const)}
            />
          </div>
          {nameError && (
            <p
              id="name-error"
              className="flex items-center gap-1.5 text-xs font-medium text-destructive"
            >
              <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>{nameError.message}</span>
            </p>
          )}
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="email"
          className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
        >
          Email
        </label>
        <div className="relative flex items-center">
          <span
            className="pointer-events-none absolute left-3.5 text-muted-foreground/60"
            aria-hidden="true"
          >
            <Mail className="h-4 w-4" />
          </span>
          <input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="nombre@ejemplo.com"
            className="w-full rounded-xl border border-input bg-background/80 pl-10 pr-3.5 py-2.5 text-sm transition-all focus:border-accent focus:bg-background focus:ring-2 focus:ring-accent/20 focus:outline-none"
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? 'email-error' : undefined}
            {...register('email')}
          />
        </div>
        {errors.email && (
          <p
            id="email-error"
            className="flex items-center gap-1.5 text-xs font-medium text-destructive"
          >
            <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>{errors.email.message}</span>
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="password"
          className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
        >
          Contraseña
        </label>
        <div className="relative flex items-center">
          <span
            className="pointer-events-none absolute left-3.5 text-muted-foreground/60"
            aria-hidden="true"
          >
            <Lock className="h-4 w-4" />
          </span>
          <input
            id="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete={isSignup ? 'new-password' : 'current-password'}
            placeholder="••••••••"
            className="w-full rounded-xl border border-input bg-background/80 pl-10 pr-10 py-2.5 text-sm transition-all focus:border-accent focus:bg-background focus:ring-2 focus:ring-accent/20 focus:outline-none"
            aria-invalid={Boolean(errors.password)}
            aria-describedby={errors.password ? 'password-error' : undefined}
            {...register('password')}
          />
          <button
            type="button"
            onClick={() => setShowPassword(prev => !prev)}
            aria-label={showPassword ? 'Ocultar clave' : 'Mostrar clave'}
            className="absolute right-2.5 p-1 text-muted-foreground/60 hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-lg"
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Eye className="h-4 w-4" aria-hidden="true" />
            )}
          </button>
        </div>
        {errors.password && (
          <p
            id="password-error"
            className="flex items-center gap-1.5 text-xs font-medium text-destructive"
          >
            <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>{errors.password.message}</span>
          </p>
        )}
      </div>

      {serverError && (
        <div role="alert" className="sr-only">
          {serverError}
        </div>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        aria-disabled={isSubmitting}
        className="mt-2 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground shadow-xs transition-all hover:bg-accent/90 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            <span>Cargando...</span>
          </>
        ) : (
          <>
            <span>{isSignup ? 'Crear cuenta' : 'Iniciar sesión'}</span>
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </>
        )}
      </button>
    </form>
  );
}
