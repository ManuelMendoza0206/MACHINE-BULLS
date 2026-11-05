'use client';

import type { JSX } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { NAV_ITEMS } from '@/config/navigation';
import { isNavItemActive } from '@/lib/navigation/isNavItemActive';
import { cn } from '@/lib/utils/cn';

/**
 * Mobile navigation: Floating Bento Island dock.
 * Soft rounded-2xl card container with smooth pill active states.
 */
export function BottomTabBar(): JSX.Element {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Navegación principal"
      className="fixed inset-x-4 bottom-3 z-40 mx-auto max-w-sm grid grid-cols-4 rounded-2xl border border-border/80 bg-background/90 p-1.5 shadow-lg backdrop-blur-md lg:hidden"
    >
      {NAV_ITEMS.map(item => {
        const active = isNavItemActive(pathname, item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'relative flex min-h-[48px] flex-col items-center justify-center gap-1 rounded-xl px-1 text-[10px] font-medium transition-all active:scale-95',
              active
                ? 'bg-accent text-accent-foreground font-semibold shadow-xs'
                : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
            )}
          >
            <Icon
              aria-hidden="true"
              className={cn('h-4 w-4', active ? 'stroke-[2.5]' : 'stroke-[1.75]')}
            />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
