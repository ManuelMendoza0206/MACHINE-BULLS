'use client';

import { useRouter } from 'next/navigation';
import { AuthForm } from '@/features/auth/components/AuthForm';

export default function SignupPage(): JSX.Element {
  const router = useRouter();

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <h1 className="text-2xl font-bold">Crear cuenta</h1>
      <p className="mt-2 text-sm text-muted-foreground">Registrate para empezar a usar StyleMe.</p>
      <div className="mt-6">
        <AuthForm mode="signup" onSuccess={() => router.push('/onboarding')} />
      </div>
    </div>
  );
}
