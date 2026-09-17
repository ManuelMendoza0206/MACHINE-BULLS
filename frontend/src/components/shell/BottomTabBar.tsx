'use client';

import type { JSX } from 'react';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { NAV_ITEMS } from '@/config/navigation';
import { isNavItemActive } from '@/lib/navigation/isNavItemActive';
import { cn } from '@/lib/utils/cn';

/** Mobile navigation. Visible below `lg` only, via CSS — no viewport JS (app-shell/spec.md §2.3). */
export function BottomTabBar(): JSX.Element {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Navegación principal"
      className="fixed inset-x-0 bottom-0 z-40 flex border-t border-border bg-background lg:hidden"
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
              'flex flex-1 flex-col items-center justify-center gap-1 py-2 text-xs',
              active ? 'font-semibold text-foreground' : 'font-normal text-muted-foreground'
            )}
          >
            <Icon
              aria-hidden="true"
              className={cn('h-5 w-5', active ? 'stroke-[2.5]' : 'stroke-2')}
            />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
