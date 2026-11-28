import { describe, it, expect } from 'vitest';
import {
  OutfitRecommendationResponseSchema,
  OutfitPositionSchema,
  OutfitRecommendRequestSchema,
  OutfitSchema,
  OutfitRemixRequestSchema,
  OutfitPlanStatusSchema,
  OutfitPlanCreateSchema,
  OutfitPlanResponseSchema,
  OutfitPlanConfirmResponseSchema,
  StylistAdviceRequestSchema,
  StylistAdviceResponseSchema,
} from '@/schemas/api/outfits';
import outfitFixture from '../../fixtures/api/outfitRecommendationResponse.json';

describe('OutfitPositionSchema', () => {
  it('accepts closed enum values', () => {
    expect(OutfitPositionSchema.safeParse('top').success).toBe(true);
    expect(OutfitPositionSchema.safeParse('invalid_position').success).toBe(false);
  });

  it.each(['top', 'bottom', 'dress', 'footwear', 'outerwear', 'bag'])(
    'acepta la posición %s',
    value => {
      expect(OutfitPositionSchema.safeParse(value).success).toBe(true);
    }
  );

  it.each([null, undefined, '', 'TOP', 'hat', 3])('rechaza la posición no-pertinente %s', value => {
    expect(OutfitPositionSchema.safeParse(value).success).toBe(false);
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

// E2-T10 — bordes de enums, rangos de score, nulls y campos faltantes.
describe('OutfitSchema — bordes', () => {
  const base = {
    outfit_id: '8c7f8b1a-1234-4567-8901-abcdef123456',
    aesthetic: 'old_money',
    garments: [{ garment_id: '3fa85f64-5717-4562-b3fc-2c963f66afa6', position: 'top' }],
    chromatic_score: 0.5,
    embedding_score: 0.5,
  } as const;

  it('acepta los scores en los bordes 0 y 1', () => {
    expect(
      OutfitSchema.safeParse({ ...base, chromatic_score: 0, embedding_score: 1 }).success
    ).toBe(true);
    expect(
      OutfitSchema.safeParse({ ...base, chromatic_score: 1, embedding_score: 0 }).success
    ).toBe(true);
  });

  it('rechaza chromatic_score fuera de [0,1] en ambos extremos', () => {
    expect(OutfitSchema.safeParse({ ...base, chromatic_score: -0.01 }).success).toBe(false);
    expect(OutfitSchema.safeParse({ ...base, chromatic_score: 1.01 }).success).toBe(false);
  });

  it('rechaza embedding_score fuera de [0,1]', () => {
    expect(OutfitSchema.safeParse({ ...base, embedding_score: -1 }).success).toBe(false);
    expect(OutfitSchema.safeParse({ ...base, embedding_score: 2 }).success).toBe(false);
  });

  it('rechaza scores no-numéricos y aesthetic null', () => {
    expect(OutfitSchema.safeParse({ ...base, chromatic_score: 'alto' }).success).toBe(false);
    expect(OutfitSchema.safeParse({ ...base, aesthetic: null }).success).toBe(false);
    expect(OutfitSchema.safeParse({ ...base, aesthetic: '' }).success).toBe(true);
  });

  it('rechaza outfit_id que no es uuid y garments no-array', () => {
    expect(OutfitSchema.safeParse({ ...base, outfit_id: 'x' }).success).toBe(false);
    expect(OutfitSchema.safeParse({ ...base, garments: 'top' }).success).toBe(false);
  });

  it('rechaza un garment ref con position fuera del enum cerrado', () => {
    const garmentId = '3fa85f64-5717-4562-b3fc-2c963f66afa6';
    expect(
      OutfitSchema.safeParse({
        ...base,
        garments: [{ garment_id: garmentId, position: 'hat' }],
      }).success
    ).toBe(false);
    expect(
      OutfitSchema.safeParse({
        ...base,
        garments: [{ garment_id: garmentId, position: 'bag' }],
      }).success
    ).toBe(true);
  });

  it('acepta occasion/weather/reason ausentes o null (opcionales)', () => {
    expect(OutfitSchema.safeParse(base).success).toBe(true);
    expect(
      OutfitSchema.safeParse({ ...base, occasion: null, weather: null, reason: null }).success
    ).toBe(true);
  });

  it('rechaza reason de tipo no-string', () => {
    expect(OutfitSchema.safeParse({ ...base, reason: 7 }).success).toBe(false);
  });

  it('tolera campos desconocidos (strip)', () => {
    const result = OutfitSchema.safeParse({ ...base, novedad: true });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).not.toHaveProperty('novedad');
  });
});

describe('OutfitRecommendationResponseSchema — bordes', () => {
  it('acepta una lista vacía (sin combinaciones aún)', () => {
    expect(OutfitRecommendationResponseSchema.safeParse({ outfits: [] }).success).toBe(true);
  });

  it('rechaza outfits ausente o no-array', () => {
    expect(OutfitRecommendationResponseSchema.safeParse({}).success).toBe(false);
    expect(OutfitRecommendationResponseSchema.safeParse({ outfits: {} }).success).toBe(false);
    expect(OutfitRecommendationResponseSchema.safeParse({ outfits: null }).success).toBe(false);
  });
});

describe('OutfitRecommendRequestSchema — bordes', () => {
  it('rechaza user_id vacío', () => {
    expect(OutfitRecommendRequestSchema.safeParse({ user_id: '' }).success).toBe(false);
  });

  it('rechaza target_aesthetic null (solo undefined es aceptado por .optional())', () => {
    expect(
      OutfitRecommendRequestSchema.safeParse({
        user_id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
        target_aesthetic: null,
      }).success
    ).toBe(false);
  });

  it('acepta todos los opcionales presentes', () => {
    expect(
      OutfitRecommendRequestSchema.safeParse({
        user_id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
        target_aesthetic: 'casual',
        available_garment_ids: ['3fa85f64-5717-4562-b3fc-2c963f66afa6'],
        occasion: 'work',
        weather: 'cold',
      }).success
    ).toBe(true);
  });

  it('rechaza available_garment_ids con ids que no son uuid', () => {
    expect(
      OutfitRecommendRequestSchema.safeParse({
        user_id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
        available_garment_ids: ['nope'],
      }).success
    ).toBe(false);
  });
});

describe('OutfitRemixRequestSchema — bordes', () => {
  const userId = '3fa85f64-5717-4562-b3fc-2c963f66afa6';

  it('rechaza pinned_garment_ids vacío (min 1)', () => {
    expect(
      OutfitRemixRequestSchema.safeParse({ user_id: userId, pinned_garment_ids: [] }).success
    ).toBe(false);
  });

  it('acepta un solo prendido anclado', () => {
    expect(
      OutfitRemixRequestSchema.safeParse({ user_id: userId, pinned_garment_ids: [userId] }).success
    ).toBe(true);
  });

  it('acepta user_id vacío (GAP conocido: remix no valida uuid)', () => {
    expect(
      OutfitRemixRequestSchema.safeParse({ user_id: '', pinned_garment_ids: ['g1'] }).success
    ).toBe(true);
  });
});

describe('OutfitPlan — schemas del planificador', () => {
  it('enum de status solo admite PLANNED/COMPLETED/CANCELLED', () => {
    expect(OutfitPlanStatusSchema.safeParse('PLANNED').success).toBe(true);
    expect(OutfitPlanStatusSchema.safeParse('CANCELLED').success).toBe(true);
    expect(OutfitPlanStatusSchema.safeParse('planned').success).toBe(false);
    expect(OutfitPlanStatusSchema.safeParse('DELETED').success).toBe(false);
  });

  it('OutfitPlanCreateSchema rechaza garment_ids vacío', () => {
    expect(
      OutfitPlanCreateSchema.safeParse({
        user_id: 'u-1',
        planned_date: '2026-11-20',
        garment_ids: [],
      }).success
    ).toBe(false);
  });

  it('OutfitPlanCreateSchema acepta el mínimo válido con opcionales ausentes', () => {
    expect(
      OutfitPlanCreateSchema.safeParse({
        user_id: 'u-1',
        planned_date: '2026-11-20',
        garment_ids: ['g1'],
      }).success
    ).toBe(true);
  });

  it('OutfitPlanResponseSchema rechaza status inválido o created_at ausente', () => {
    const plan = {
      id: 'plan-1',
      user_id: 'u-1',
      planned_date: '2026-11-20',
      garment_ids: ['g1'],
      status: 'PLANNED',
      created_at: '2026-11-07T12:00:00Z',
      updated_at: '2026-11-07T12:00:00Z',
    };
    expect(OutfitPlanResponseSchema.safeParse(plan).success).toBe(true);
    expect(OutfitPlanResponseSchema.safeParse({ ...plan, status: 'DONE' }).success).toBe(false);
    const { created_at: _omit, ...rest } = plan;
    void _omit;
    expect(OutfitPlanResponseSchema.safeParse(rest).success).toBe(false);
  });

  it('OutfitPlanConfirmResponseSchema rechaza usage_logged no-boolean', () => {
    const confirm = {
      plan: {
        id: 'plan-1',
        user_id: 'u-1',
        planned_date: '2026-11-20',
        garment_ids: ['g1'],
        status: 'COMPLETED',
        created_at: '2026-11-07T12:00:00Z',
        updated_at: '2026-11-07T12:00:00Z',
      },
      usage_logged: true,
      garments_marked_laundry: [],
    };
    expect(OutfitPlanConfirmResponseSchema.safeParse(confirm).success).toBe(true);
    expect(
      OutfitPlanConfirmResponseSchema.safeParse({ ...confirm, usage_logged: 'yes' }).success
    ).toBe(false);
    expect(
      OutfitPlanConfirmResponseSchema.safeParse({ ...confirm, garments_marked_laundry: 'g1' })
        .success
    ).toBe(false);
  });
});

describe('StylistAdvice Schemas', () => {
  it('valida payload y respuesta estructurada de estilista IA', () => {
    expect(
      StylistAdviceRequestSchema.safeParse({
        occasion: 'work',
        weather: 'cold',
        user_note: 'Reunion importante',
      }).success
    ).toBe(true);

    expect(
      StylistAdviceRequestSchema.safeParse({
        user_note: 'x'.repeat(301),
      }).success
    ).toBe(false);

    const validResponse = {
      outfit_id: '8c7f8b1a-1234-4567-8901-abcdef123456',
      why_it_works: 'Equilibrio cromatico y de capas.',
      accessories: ['Reloj limpio'],
      grooming_and_footwear: 'Botines oscuros.',
      event_adaptation: 'Agrega blazer.',
      source: 'azure_openai',
      model: 'styleme-gpt-5-mini',
      cached: false,
    };
    expect(StylistAdviceResponseSchema.safeParse(validResponse).success).toBe(true);
    expect(
      StylistAdviceResponseSchema.safeParse({ ...validResponse, source: 'rules', model: null })
        .success
    ).toBe(true);
    expect(
      StylistAdviceResponseSchema.safeParse({ ...validResponse, accessories: [] }).success
    ).toBe(false);
    expect(
      StylistAdviceResponseSchema.safeParse({ ...validResponse, source: 'unknown' }).success
    ).toBe(false);
  });
});
