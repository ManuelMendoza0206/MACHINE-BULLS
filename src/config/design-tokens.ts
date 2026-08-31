// Design tokens for StyleMe frontend
// Source of truth for colors, typography, spacing
// Derived from openspec/specs/frontend/design-system/spec.md §2.1

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
} as const;

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
