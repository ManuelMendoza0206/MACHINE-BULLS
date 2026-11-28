'use client';

import { Suspense, useEffect } from 'react';
import type { JSX } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AuthForm } from '@/features/auth/components/AuthForm';
import { AuthScreenLayout } from '@/features/auth/components/AuthScreenLayout';
import { redirectAfterAuth, sanitizeRedirectPath } from '@/features/auth/api/auth';
import { useAuth } from '@/features/auth/hooks/useAuth';

function LoginContent(): JSX.Element {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { status } = useAuth();
  const redirectTo = sanitizeRedirectPath(searchParams.get('redirectTo'), '/wardrobe');

  useEffect(() => {
    if (status === 'authenticated') {
      router.replace(redirectTo);
    }
  }, [status, redirectTo, router]);

  return <AuthForm mode="login" onSuccess={() => redirectAfterAuth(redirectTo, router)} />;
}

export default function LoginPage(): JSX.Element {
  return (
    <AuthScreenLayout
      mode="login"
      title="Iniciar sesión"
      subtitle="Ingresa con tu email y contraseña para ver tus prendas y pruebas."
    >
      <Suspense
        fallback={
          <p className="text-sm text-muted-foreground py-4 text-center">Cargando formulario...</p>
        }
      >
        <LoginContent />
      </Suspense>
    </AuthScreenLayout>
  );
}
