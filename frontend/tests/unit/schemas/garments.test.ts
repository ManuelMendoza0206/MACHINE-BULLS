import { describe, it, expect } from 'vitest';
import { GarmentUploadResponseSchema } from '@/schemas/api/garments';
import garmentFixture from '../../fixtures/api/garmentUploadResponse.json';

describe('GarmentUploadResponseSchema', () => {
  it('parses valid fixture', () => {
    expect(GarmentUploadResponseSchema.safeParse(garmentFixture).success).toBe(true);
  });

  it('fails when required field missing', () => {
    const { garment_id: _omit, ...rest } = garmentFixture as Record<string, unknown>;
    void _omit;
    const result = GarmentUploadResponseSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it('fails when confidence is string instead of number', () => {
    const bad = {
      ...garmentFixture,
      top_aesthetics: [{ aesthetic: 'old_money', confidence: 'alta' }],
    };
    expect(GarmentUploadResponseSchema.safeParse(bad).success).toBe(false);
  });

  it('fails when hex is invalid', () => {
    const bad = {
      ...garmentFixture,
      dominant_colors: [{ h: 210, s: 15, v: 92, hex: 'not-a-hex' }],
    };
    expect(GarmentUploadResponseSchema.safeParse(bad).success).toBe(false);
  });

  it('accepts any string category (gap)', () => {
    const withUnknown = { ...garmentFixture, category: 'unknown_category_xyz' };
    expect(GarmentUploadResponseSchema.safeParse(withUnknown).success).toBe(true);
  });
});
