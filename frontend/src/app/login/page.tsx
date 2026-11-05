'use client';

import { Suspense } from 'react';
import type { JSX } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AuthForm } from '@/features/auth/components/AuthForm';
import { AuthScreenLayout } from '@/features/auth/components/AuthScreenLayout';

function LoginContent(): JSX.Element {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirectTo') ?? '/wardrobe';

  return <AuthForm mode="login" onSuccess={() => router.push(redirectTo)} />;
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
