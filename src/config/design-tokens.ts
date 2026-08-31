/**
 * Design tokens — single source of truth for color, typography and spacing.
 * Values mirror `openspec/specs/frontend/design-system/spec.md` §2.1 (which mirrors
 * `CLAUDE.md` §5.1). Nothing else in the codebase may hardcode a colour:
 *  - `tailwind.config.ts` derives its colour scale from `colorTokens` keys.
 *  - `src/app/globals.css` publishes the HSL channels as CSS variables; the test
 *    `tests/unit/config/design-tokens.contrast.test.ts` (Tarea 1) keeps that file in
 *    sync with `hexToHslChannels(...)` and enforces the WCAG-AA contrast budget.
 */

type ThemeValue = { readonly light: `#${string}`; readonly dark: `#${string}` };

export const colorTokens = {
  background: { light: '#FAFAF9', dark: '#0C0C0D' },
  foreground: { light: '#18181B', dark: '#F4F4F5' },
  muted: { light: '#F1F0EE', dark: '#1A1A1C' },
  mutedForeground: { light: '#71717A', dark: '#A1A1AA' },
  border: { light: '#E4E4E7', dark: '#27272A' },
  input: { light: '#E4E4E7', dark: '#27272A' },
  accent: { light: '#1C1C1E', dark: '#F4F4F5' },
  accentForeground: { light: '#F4F4F5', dark: '#1C1C1E' },
  success: { light: '#16A34A', dark: '#22C55E' },
  successForeground: { light: '#F4F4F5', dark: '#0C0C0D' },
  destructive: { light: '#DC2626', dark: '#EF4444' },
  destructiveForeground: { light: '#F4F4F5', dark: '#0C0C0D' },
} as const satisfies Record<string, ThemeValue>;

export const typeScale = {
  xs: 'text-xs',
  sm: 'text-sm',
  base: 'text-base',
  lg: 'text-lg',
  xl: 'text-xl',
  '2xl': 'text-2xl',
  '3xl': 'text-3xl',
  '4xl': 'text-4xl',
} as const;

export const spacing = {
  xs: '0.25rem',
  sm: '0.5rem',
  md: '1rem',
  lg: '1.5rem',
  xl: '2rem',
  '2xl': '3rem',
  '3xl': '4rem',
} as const;

export type ColorToken = keyof typeof colorTokens;
export type TypeScale = keyof typeof typeScale;
export type Spacing = keyof typeof spacing;

/** camelCase token name -> kebab-case CSS variable / Tailwind colour name. */
export function toKebabCase(name: string): string {
  return name.replace(/[A-Z]/g, m => `-${m.toLowerCase()}`);
}

/**
 * Convert a `#rrggbb` hex string to `"H S% L%"` — the channel form Tailwind's
 * `hsl(var(--token) / <alpha-value>)` expects. Pure; no dependencies.
 */
export function hexToHslChannels(hex: string): string {
  const normalized = hex.replace('#', '');
  const r = parseInt(normalized.slice(0, 2), 16) / 255;
  const g = parseInt(normalized.slice(2, 4), 16) / 255;
  const b = parseInt(normalized.slice(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  const lightness = (max + min) / 2;

  let hue = 0;
  let saturation = 0;

  if (delta !== 0) {
    saturation = delta / (1 - Math.abs(2 * lightness - 1));
    switch (max) {
      case r:
        hue = ((g - b) / delta) % 6;
        break;
      case g:
        hue = (b - r) / delta + 2;
        break;
      default:
        hue = (r - g) / delta + 4;
    }
    hue *= 60;
    if (hue < 0) hue += 360;
  }

  const h = Math.round(hue);
  const s = Math.round(saturation * 100);
  const l = Math.round(lightness * 100);
  return `${h} ${s}% ${l}%`;
}

/** All token CSS variables for a theme, e.g. `{ '--background': '60 9% 98%', ... }`. */
export function cssVariablesForTheme(theme: 'light' | 'dark'): Record<string, string> {
  return Object.fromEntries(
    (Object.entries(colorTokens) as [ColorToken, ThemeValue][]).map(([name, value]) => [
      `--${toKebabCase(name)}`,
      hexToHslChannels(value[theme]),
    ])
  );
}
