import { describe, it, expect } from 'vitest';
import { getContrastRatio } from '@/lib/utils/getContrastRatio';

// design-system/spec.md — Requirement "Contrast ratio calculator utility" (WCAG 2.x / ISO-IEC 40500).
describe('getContrastRatio', () => {
  it('returns 21 for pure white vs pure black', () => {
    expect(getContrastRatio('#FFFFFF', '#000000')).toBeCloseTo(21, 2);
  });

  it('is order-independent', () => {
    expect(getContrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 2);
  });

  it('returns 1 for identical colors', () => {
    expect(getContrastRatio('#3B82F6', '#3B82F6')).toBeCloseTo(1, 5);
  });

  it('accepts shorthand hex and a leading-hashless string', () => {
    expect(getContrastRatio('#fff', '000')).toBeCloseTo(21, 2);
  });

  it('matches a known reference pair (#767676 on #FFFFFF ≈ 4.54)', () => {
    // #767676 is the classic "smallest grey that passes AA on white".
    expect(getContrastRatio('#767676', '#FFFFFF')).toBeGreaterThanOrEqual(4.5);
    expect(getContrastRatio('#777777', '#FFFFFF')).toBeLessThan(4.5);
  });
});
