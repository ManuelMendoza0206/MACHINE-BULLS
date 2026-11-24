'use client';

import { useEffect } from 'react';
import type { JSX } from 'react';
import { useRouter } from 'next/navigation';
import { AuthForm } from '@/features/auth/components/AuthForm';
import { AuthScreenLayout } from '@/features/auth/components/AuthScreenLayout';
import { redirectAfterAuth } from '@/features/auth/api/auth';
import { useAuth } from '@/features/auth/hooks/useAuth';

export default function SignupPage(): JSX.Element {
  const router = useRouter();
  const { status } = useAuth();

  useEffect(() => {
    if (status === 'authenticated') {
      router.replace('/wardrobe');
    }
  }, [status, router]);

  return (
    <AuthScreenLayout
      mode="signup"
      title="Crear cuenta"
      subtitle="Crea tu cuenta para guardar prendas, armar combinaciones y probarlas."
    >
      <AuthForm mode="signup" onSuccess={() => redirectAfterAuth('/wardrobe', router)} />
    </AuthScreenLayout>
  );
}
