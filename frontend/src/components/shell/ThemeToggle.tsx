'use client';

import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { Monitor, Moon, Sun } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

const ORDER = ['system', 'light', 'dark'] as const;
type ThemeChoice = (typeof ORDER)[number];

const META: Record<ThemeChoice, { label: string; Icon: typeof Sun }> = {
  system: { label: 'Tema: sistema', Icon: Monitor },
  light: { label: 'Tema: claro', Icon: Sun },
  dark: { label: 'Tema: oscuro', Icon: Moon },
};

/**
 * Cycles system → light → dark. Renders a stable placeholder until mounted so the
 * server and first client render match (next-themes can only know the real theme on the client).
 */
export function ThemeToggle({ className }: { className?: string }): JSX.Element {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const current: ThemeChoice = mounted && isThemeChoice(theme) ? theme : 'system';
  const { label, Icon } = META[current];
  const next = ORDER[(ORDER.indexOf(current) + 1) % ORDER.length]!;

  return (
    <button
      type="button"
      onClick={() => setTheme(next)}
      aria-label={label}
      title={label}
      className={cn(
        'inline-flex h-9 w-9 items-center justify-center rounded-md border border-border',
        'text-foreground transition-colors hover:bg-muted',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        className
      )}
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
      <span className="sr-only">{label}</span>
    </button>
  );
}

function isThemeChoice(value: string | undefined): value is ThemeChoice {
  return value === 'system' || value === 'light' || value === 'dark';
}
