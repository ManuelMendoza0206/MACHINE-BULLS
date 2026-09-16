'use client';

import Link from 'next/link';
import { useAuth } from '@/features/auth/hooks/useAuth';

export function LandingCta(): JSX.Element {
  const { status } = useAuth();
  const href = status === 'authenticated' ? '/wardrobe' : '/signup';

  return (
    <Link
      href={href}
      className="inline-flex rounded-md bg-primary px-6 py-3 font-medium text-primary-foreground hover:bg-primary/90"
    >
      Empezar
    </Link>
  );
}
