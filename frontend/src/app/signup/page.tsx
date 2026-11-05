'use client';

import type { JSX } from 'react';
import { useRouter } from 'next/navigation';
import { AuthForm } from '@/features/auth/components/AuthForm';
import { AuthScreenLayout } from '@/features/auth/components/AuthScreenLayout';

export default function SignupPage(): JSX.Element {
  const router = useRouter();

  return (
    <AuthScreenLayout
      mode="signup"
      title="Crear cuenta"
      subtitle="Crea tu cuenta para guardar prendas, armar combinaciones y probarlas."
    >
      <AuthForm mode="signup" onSuccess={() => router.push('/wardrobe')} />
    </AuthScreenLayout>
  );
}
