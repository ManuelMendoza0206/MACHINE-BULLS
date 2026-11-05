'use client';

import type { JSX } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { NAV_ITEMS } from '@/config/navigation';
import { isNavItemActive } from '@/lib/navigation/isNavItemActive';
import { cn } from '@/lib/utils/cn';
import { ThemeToggle } from './ThemeToggle';

/**
 * Desktop navigation: Floating Bento Island dock.
 * Smooth rounded-full pill tabs with responsive glassmorphism.
 */
export function TopNav(): JSX.Element {
  const pathname = usePathname();

  return (
    <header className="sticky top-3 z-40 hidden px-4 sm:px-6 lg:block max-w-[1440px] mx-auto">
      <nav
        aria-label="Navegación principal"
        className="flex h-14 items-center justify-between rounded-full border border-border/80 bg-background/85 px-4 shadow-xs backdrop-blur-md transition-all"
      >
        <Link href="/wardrobe" className="flex items-center gap-2.5 pr-2 group">
          <span className="relative grid h-8 w-8 shrink-0 place-items-center rounded-full bg-accent text-accent-foreground shadow-xs transition-transform group-hover:scale-105">
            <span className="h-3 w-3 rounded-full bg-background" />
          </span>
          <span className="font-extrabold tracking-wider text-base text-foreground">STYLEME</span>
        </Link>

        <ul className="flex items-center gap-1 rounded-full bg-muted/60 p-1 border border-border/50">
          {NAV_ITEMS.map((item, index) => {
            const active = isNavItemActive(pathname, item.href);
            const Icon = item.icon;
            return (
              <li key={item.href} className="flex">
                <Link
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'relative flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-medium transition-all',
                    active
                      ? 'bg-accent text-accent-foreground font-semibold shadow-xs'
                      : 'text-muted-foreground hover:bg-background/80 hover:text-foreground'
                  )}
                >
                  <span
                    aria-hidden="true"
                    className={cn('text-[10px] font-mono', active ? 'opacity-90' : 'opacity-50')}
                  >
                    0{index + 1}
                  </span>
                  <Icon
                    aria-hidden="true"
                    className={cn('h-3.5 w-3.5', active ? 'stroke-[2.5]' : 'stroke-[1.75]')}
                  />
                  <span>{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="flex items-center gap-3">
          <span className="hidden text-xs font-mono text-muted-foreground xl:block bg-muted/50 px-2.5 py-1 rounded-full border border-border/40">
            VTON Multicapa
          </span>
          <ThemeToggle className="rounded-full border-border/70 hover:bg-muted" />
        </div>
      </nav>
    </header>
  );
}
