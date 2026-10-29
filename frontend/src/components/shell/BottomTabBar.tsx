'use client';

import type { JSX } from 'react';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { NAV_ITEMS } from '@/config/navigation';
import { isNavItemActive } from '@/lib/navigation/isNavItemActive';
import { cn } from '@/lib/utils/cn';

/**
 * Mobile navigation: the same four sections as an index strip of sample cards. Visible
 * below `lg` only, via CSS — no viewport JS (app-shell/spec.md §2.3).
 */
export function BottomTabBar(): JSX.Element {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Navegación principal"
      className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t border-border bg-background pb-[env(safe-area-inset-bottom)] lg:hidden"
    >
      {NAV_ITEMS.map((item, index) => {
        const active = isNavItemActive(pathname, item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'relative flex min-h-[58px] flex-col items-center justify-center gap-1 px-1 pt-1 text-[9px] font-semibold uppercase tracking-[0.12em] transition-colors',
              active
                ? 'bg-accent text-accent-foreground font-semibold'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            {active ? (
              <span aria-hidden="true" className="absolute inset-x-0 top-0 h-[2px] bg-thread" />
            ) : null}
            <span
              aria-hidden="true"
              className={cn('num text-[8px]', active ? 'text-accent-foreground/60' : 'opacity-50')}
            >
              {String(index + 1).padStart(2, '0')}
            </span>
            <Icon
              aria-hidden="true"
              className={cn('h-[18px] w-[18px]', active ? 'stroke-[2.25]' : 'stroke-[1.75]')}
            />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
