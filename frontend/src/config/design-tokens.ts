/**
 * Design tokens — single source of truth for colour, typography and spacing.
 * Authoritative values: this file. `openspec/specs/frontend/design-system/spec.md` §2.1
 * and `docs/context/frontend-plan.md` §5.1 mirror it. Nothing else may hardcode a colour:
 *  - `src/app/globals.css` publishes the HSL channels as CSS variables and maps them
 *    into Tailwind v4 utilities via its `@theme inline` block; the test
 *    `tests/unit/config/design-tokens.contrast.test.ts` keeps that file in sync with
 *    `hexToHslChannels(...)` and enforces the WCAG-AA contrast budget.
 *
 * World: "muestrario de telas" (fabric sample book). The app sits on an unbleached
 * muslin table (`ground`), work happens on paper cards (`background`), and the shell is
 * dyed indigo (`accent`). `thread` is tailor's red: attention, the stitch, destructive
 * confirmation — never decoration.
 */

type ThemeValue = { readonly light: `#${string}`; readonly dark: `#${string}` };

export const colorTokens = {
  /** Paper: the card you read and write on. */
  background: { light: '#FFFFFF', dark: '#15191C' },
  /** The table the paper sits on. */
  ground: { light: '#EDEEE7', dark: '#0D1012' },
  foreground: { light: '#14171A', dark: '#ECEEE8' },
  muted: { light: '#E7E8DF', dark: '#1C2226' },
  mutedForeground: { light: '#4A5156', dark: '#A9B2AE' },
  border: { light: '#D3D5CA', dark: '#2A3236' },
  input: { light: '#D3D5CA', dark: '#2A3236' },
  /** Indigo dye: the shell band and primary actions. */
  accent: { light: '#1B3A5B', dark: '#93B4D8' },
  accentForeground: { light: '#FFFFFF', dark: '#0D1012' },
  /** Tailor's thread: attention and destructive confirmation. */
  thread: { light: '#A63B24', dark: '#E38168' },
  threadForeground: { light: '#FFFFFF', dark: '#0D1012' },
  success: { light: '#2C6642', dark: '#74C08D' },
  successForeground: { light: '#FFFFFF', dark: '#0D1012' },
  warning: { light: '#8A5A12', dark: '#E0AC57' },
  warningForeground: { light: '#FFFFFF', dark: '#0D1012' },
  destructive: { light: '#9E2A22', dark: '#EC7B72' },
  destructiveForeground: { light: '#FFFFFF', dark: '#0D1012' },
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
  '5xl': 'text-5xl',
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

  let h = 0;
  let s = 0;

  if (delta !== 0) {
    s = delta / (1 - Math.abs(2 * lightness - 1));
    switch (max) {
      case r:
        h = 60 * (((g - b) / delta) % 6);
        break;
      case g:
        h = 60 * ((b - r) / delta + 2);
        break;
      default:
        h = 60 * ((r - g) / delta + 4);
    }
  }

  if (h < 0) h += 360;

  const round = (n: number): number => Math.round(n * 10) / 10;
  return `${round(h)} ${round(s * 100)}% ${round(lightness * 100)}%`;
}
