import { describe, it, expect } from 'vitest';
import { cn } from '@/lib/utils/cn';

// design-system/spec.md — Requirement "Utility function cn() for class merging".
describe('cn', () => {
  it('resolves conflicting Tailwind classes (last wins, no duplication)', () => {
    expect(cn('px-4', 'px-6')).toBe('px-6');
  });

  it('includes truthy conditional classes and drops falsy ones', () => {
    expect(cn('text-sm', { 'font-bold': true, italic: false })).toBe('text-sm font-bold');
  });

  it('flattens arrays and ignores undefined / null', () => {
    expect(cn(['text-base', undefined], 'p-4', null)).toBe('text-base p-4');
  });

  it('collapses conflicting Tailwind utilities to the last one', () => {
    expect(cn('text-sm', 'text-lg')).toBe('text-lg');
  });

  it('returns an empty string for no meaningful input', () => {
    expect(cn(undefined, null, false, '')).toBe('');
  });
});
