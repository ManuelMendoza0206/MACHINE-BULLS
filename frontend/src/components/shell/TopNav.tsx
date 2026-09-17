'use client';

import type { JSX } from 'react';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { NAV_ITEMS } from '@/config/navigation';
import { isNavItemActive } from '@/lib/navigation/isNavItemActive';
import { cn } from '@/lib/utils/cn';
import { ThemeToggle } from './ThemeToggle';

/** Desktop navigation. Visible at `lg+` only, via CSS — no viewport JS (app-shell/spec.md §2.3). */
export function TopNav(): JSX.Element {
  const pathname = usePathname();

  return (
    <header className="hidden border-b border-border lg:block">
      <nav
        aria-label="Navegación principal"
        className="mx-auto flex h-14 max-w-7xl items-center gap-6 px-8"
      >
        <Link href="/wardrobe" className="text-base font-semibold">
          StyleMe
        </Link>
        <ul className="flex items-center gap-1">
          {NAV_ITEMS.map(item => {
            const active = isNavItemActive(pathname, item.href);
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors hover:bg-muted',
                    // Two non-colour signals for the active item: weight + icon stroke.
                    active ? 'font-semibold text-foreground' : 'font-normal text-muted-foreground'
                  )}
                >
                  <Icon
                    aria-hidden="true"
                    className={cn('h-4 w-4', active ? 'stroke-[2.5]' : 'stroke-2')}
                  />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
        <div className="ml-auto">
          <ThemeToggle />
        </div>
      </nav>
    </header>
  );
}
