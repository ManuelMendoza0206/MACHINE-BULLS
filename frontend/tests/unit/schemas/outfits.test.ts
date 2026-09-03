import { describe, it, expect } from 'vitest';
import {
  OutfitRecommendationResponseSchema,
  OutfitPositionSchema,
  OutfitRecommendRequestSchema,
} from '@/schemas/api/outfits';
import outfitFixture from '../../fixtures/api/outfitRecommendationResponse.json';

describe('OutfitPositionSchema', () => {
  it('accepts closed enum values', () => {
    expect(OutfitPositionSchema.safeParse('top').success).toBe(true);
    expect(OutfitPositionSchema.safeParse('invalid_position').success).toBe(false);
  });
});

describe('OutfitRecommendationResponseSchema', () => {
  it('parses valid fixture', () => {
    expect(OutfitRecommendationResponseSchema.safeParse(outfitFixture).success).toBe(true);
  });

  it('fails when garments is empty', () => {
    const bad = {
      outfits: [{ ...outfitFixture.outfits[0], garments: [] }],
    };
    expect(OutfitRecommendationResponseSchema.safeParse(bad).success).toBe(false);
  });

  it('fails when chromatic_score out of range', () => {
    const bad = {
      outfits: [{ ...outfitFixture.outfits[0], chromatic_score: 1.5 }],
    };
    expect(OutfitRecommendationResponseSchema.safeParse(bad).success).toBe(false);
  });

  it('accepts any string aesthetic (gap)', () => {
    const withUnknown = {
      outfits: [{ ...outfitFixture.outfits[0], aesthetic: 'some_new_aesthetic' }],
    };
    expect(OutfitRecommendationResponseSchema.safeParse(withUnknown).success).toBe(true);
  });
});

describe('OutfitRecommendRequestSchema', () => {
  it('parses minimal valid request', () => {
    expect(
      OutfitRecommendRequestSchema.safeParse({
        user_id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
      }).success
    ).toBe(true);
  });

  it('fails with invalid uuid', () => {
    expect(OutfitRecommendRequestSchema.safeParse({ user_id: 'not-a-uuid' }).success).toBe(false);
  });
});
