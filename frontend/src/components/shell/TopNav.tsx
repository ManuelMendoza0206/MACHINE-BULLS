'use client';

import type { JSX } from 'react';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { NAV_ITEMS } from '@/config/navigation';
import { isNavItemActive } from '@/lib/navigation/isNavItemActive';
import { cn } from '@/lib/utils/cn';
import { ThemeToggle } from './ThemeToggle';

/**
 * Desktop navigation: the indigo selvedge of the sample book. The active section is a
 * paper tab lifted out of the dye band, marked by a thread rule — the signature move of
 * the shell. Visible at `lg+` only, via CSS (app-shell/spec.md §2.3).
 */
export function TopNav(): JSX.Element {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 hidden border-b border-accent bg-accent text-accent-foreground lg:block">
      <nav
        aria-label="Navegación principal"
        className="mx-auto flex h-16 max-w-[1440px] items-stretch gap-5 px-6 xl:px-10"
      >
        <Link href="/wardrobe" className="flex items-center gap-3 pr-2">
          <span className="relative grid h-8 w-8 shrink-0 place-items-center rounded-full bg-accent-foreground">
            <span className="h-3.5 w-3.5 rounded-full bg-accent" />
          </span>
          <span className="display text-[17px] leading-none">STYLEME</span>
        </Link>

        <ul className="flex items-stretch">
          {NAV_ITEMS.map((item, index) => {
            const active = isNavItemActive(pathname, item.href);
            const Icon = item.icon;
            return (
              <li key={item.href} className="flex">
                <Link
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'relative flex items-center gap-2.5 px-3.5 text-[11px] font-semibold uppercase tracking-[0.14em] transition-colors xl:px-4',
                    active
                      ? 'bg-background text-foreground font-semibold'
                      : 'text-accent-foreground/70 hover:bg-accent-foreground/10 hover:text-accent-foreground'
                  )}
                >
                  <span
                    aria-hidden="true"
                    className={cn('num text-[10px]', active ? 'text-thread' : 'opacity-55')}
                  >
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <Icon
                    aria-hidden="true"
                    className={cn('h-4 w-4', active ? 'stroke-[2.5]' : 'stroke-[1.75]')}
                  />
                  {item.label}
                  {active ? (
                    <span
                      aria-hidden="true"
                      className="absolute inset-x-0 bottom-0 h-[3px] bg-thread"
                    />
                  ) : null}
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="ml-auto flex items-center gap-3">
          <span className="label hidden text-accent-foreground/55 xl:block">
            Probador virtual multicapa
          </span>
          <ThemeToggle className="border-accent-foreground/30 text-accent-foreground hover:bg-accent-foreground/10" />
        </div>
      </nav>
    </header>
  );
}
