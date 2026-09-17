'use client';

import { Suspense } from 'react';
import type { JSX } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AuthForm } from '@/features/auth/components/AuthForm';

function LoginContent(): JSX.Element {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirectTo') ?? '/wardrobe';

  return <AuthForm mode="login" onSuccess={() => router.push(redirectTo)} />;
}

export default function LoginPage(): JSX.Element {
  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <h1 className="text-2xl font-bold">Iniciar sesión</h1>
      <p className="mt-2 text-sm text-muted-foreground">Ingresá tus credenciales para continuar.</p>
      <div className="mt-6">
        <Suspense fallback={<p className="text-sm text-muted-foreground">Cargando...</p>}>
          <LoginContent />
        </Suspense>
      </div>
    </div>
  );
}
