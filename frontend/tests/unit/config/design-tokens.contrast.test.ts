import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect } from 'vitest';
import { colorTokens, hexToHslChannels, toKebabCase } from '@/config/design-tokens';
import { getContrastRatio } from '@/lib/utils/getContrastRatio';

/**
 * design-system/spec.md — Requirement "Design tokens with WCAG AA contrast".
 * Guards two things:
 *  1. every TEXT pair meets WCAG AA (>= 4.5:1) in light and dark;
 *  2. src/app/globals.css is a faithful HSL projection of the hex tokens.
 */

type Theme = 'light' | 'dark';
const THEMES: Theme[] = ['light', 'dark'];

// [foreground token, background token] — the pairs where real text sits on a fill.
const TEXT_PAIRS: [keyof typeof colorTokens, keyof typeof colorTokens][] = [
  ['foreground', 'background'],
  ['mutedForeground', 'muted'],
  ['accentForeground', 'accent'],
  ['successForeground', 'success'],
  ['warningForeground', 'warning'],
  ['destructiveForeground', 'destructive'],
];

describe('design tokens — WCAG AA contrast', () => {
  for (const theme of THEMES) {
    for (const [fg, bg] of TEXT_PAIRS) {
      it(`${theme}: ${fg} on ${bg} is >= 4.5:1`, () => {
        const ratio = getContrastRatio(colorTokens[fg][theme], colorTokens[bg][theme]);
        expect(ratio).toBeGreaterThanOrEqual(4.5);
      });
    }
  }
});

describe('globals.css stays in sync with the token source', () => {
  const css = readFileSync(resolve(process.cwd(), 'src/app/globals.css'), 'utf8');

  const block = (selector: string): Record<string, string> => {
    const start = css.indexOf(selector);
    const open = css.indexOf('{', start);
    const close = css.indexOf('}', open);
    const body = css.slice(open + 1, close);
    const vars: Record<string, string> = {};
    for (const line of body.split('\n')) {
      const m = line.match(/--([\w-]+):\s*([^;]+);/);
      if (m && m[1] && m[2]) vars[m[1]] = m[2].trim();
    }
    return vars;
  };

  const cssByTheme: Record<Theme, Record<string, string>> = {
    light: block(':root'),
    dark: block('.dark'),
  };

  for (const theme of THEMES) {
    for (const name of Object.keys(colorTokens) as (keyof typeof colorTokens)[]) {
      const cssVar = toKebabCase(name);
      it(`${theme}: --${cssVar} equals hexToHslChannels(${name})`, () => {
        expect(cssByTheme[theme][cssVar]).toBe(hexToHslChannels(colorTokens[name][theme]));
      });
    }
  }
});
