'use client';

import type { JSX } from 'react';

import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/features/auth/hooks/useAuth';

export function LandingCta(): JSX.Element {
  const { status } = useAuth();
  const href = status === 'authenticated' ? '/wardrobe' : '/signup';

  return (
    <Button asChild size="lg">
      <Link href={href}>
        {status === 'authenticated' ? 'Abrir mi armario' : 'Empezar gratis'}
        <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
      </Link>
    </Button>
  );
}
