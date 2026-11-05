'use client';

import type { JSX, ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { TopNav } from './TopNav';
import { BottomTabBar } from './BottomTabBar';
import { cn } from '@/lib/utils/cn';

interface AppShellProps {
  children: ReactNode;
}

/**
 * Shell layout controller:
 * In regular app pages (/wardrobe, /outfits, /try-on, /profile), displays TopNav (lg+)
 * and BottomTabBar (mobile) with proper scroll padding.
 * In full-screen authentication routes (/login, /signup), bypasses the standard
 * shell chrome entirely so the auth experience owns the full viewport.
 */
export function AppShell({ children }: AppShellProps): JSX.Element {
  const pathname = usePathname();
  const isAuthRoute = pathname === '/login' || pathname === '/signup';

  if (isAuthRoute) {
    return (
      <main id="main-content" tabIndex={-1} className="min-h-full h-full w-full">
        {children}
      </main>
    );
  }

  return (
    <>
      <TopNav />
      <main id="main-content" tabIndex={-1} className={cn('min-h-full h-full pb-24 lg:pb-0')}>
        {children}
      </main>
      <BottomTabBar />
    </>
  );
}
