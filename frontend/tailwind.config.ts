import type { Config } from 'tailwindcss';
import { colorTokens, toKebabCase } from './src/config/design-tokens';

/**
 * Colour scale is derived from the token source of truth — the names come from
 * `colorTokens`, the values resolve at runtime from the CSS variables published in
 * `src/app/globals.css` (so the light/dark switch works via the `.dark` class).
 * No colour literal lives in this file.
 */
const colors = Object.fromEntries(
  Object.keys(colorTokens).map((name) => {
    const cssName = toKebabCase(name);
    return [cssName, `hsl(var(--${cssName}) / <alpha-value>)`];
  }),
);

const config: Config = {
  darkMode: 'class',
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors,
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        xs: ['0.75rem', { lineHeight: '1rem' }],
        sm: ['0.875rem', { lineHeight: '1.25rem' }],
        base: ['1rem', { lineHeight: '1.5rem' }],
        lg: ['1.125rem', { lineHeight: '1.75rem' }],
        xl: ['1.25rem', { lineHeight: '1.75rem' }],
        '2xl': ['1.5rem', { lineHeight: '2rem' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
        '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
      },
    },
  },
  plugins: [],
};

export default config;
