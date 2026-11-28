import { describe, it, expect } from 'vitest';
import {
  AestheticScoreSchema,
  DominantColorSchema,
  GarmentPositionSchema,
  GarmentStatusSchema,
  GarmentSummarySchema,
  GarmentUploadResponseSchema,
  CapsuleCatalogResponseSchema,
  GarmentsListResponseSchema,
} from '@/schemas/api/garments';
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

// E2-T10 — bordes de enums, rangos numéricos, regex de color y campos obligatorios.
describe('AestheticScoreSchema — bordes', () => {
  it('acepta confidence exactamente en 0 y 1', () => {
    expect(AestheticScoreSchema.safeParse({ aesthetic: 'casual', confidence: 0 }).success).toBe(
      true
    );
    expect(AestheticScoreSchema.safeParse({ aesthetic: 'casual', confidence: 1 }).success).toBe(
      true
    );
  });

  it('rechaza confidence fuera de [0,1]', () => {
    expect(AestheticScoreSchema.safeParse({ aesthetic: 'casual', confidence: 1.01 }).success).toBe(
      false
    );
    expect(AestheticScoreSchema.safeParse({ aesthetic: 'casual', confidence: -0.01 }).success).toBe(
      false
    );
  });

  it('acepta aesthetic vacío pero no no-string', () => {
    expect(AestheticScoreSchema.safeParse({ aesthetic: '', confidence: 0.5 }).success).toBe(true);
    expect(AestheticScoreSchema.safeParse({ aesthetic: null, confidence: 0.5 }).success).toBe(
      false
    );
    expect(
      AestheticScoreSchema.safeParse({ aesthetic: 'casual', confidence: 'alta' }).success
    ).toBe(false);
  });
});

describe('DominantColorSchema — bordes', () => {
  const base = { h: 210, s: 15, v: 92, hex: '#E8ECF1' } as const;

  it('acepta h en los bordes 0 y 360 y s/v en 0 y 100', () => {
    expect(DominantColorSchema.safeParse({ ...base, h: 0, s: 0, v: 0 }).success).toBe(true);
    expect(DominantColorSchema.safeParse({ ...base, h: 360, s: 100, v: 100 }).success).toBe(true);
  });

  it('rechaza h/s/v fuera de rango', () => {
    expect(DominantColorSchema.safeParse({ ...base, h: 361 }).success).toBe(false);
    expect(DominantColorSchema.safeParse({ ...base, h: -1 }).success).toBe(false);
    expect(DominantColorSchema.safeParse({ ...base, s: 101 }).success).toBe(false);
    expect(DominantColorSchema.safeParse({ ...base, v: -1 }).success).toBe(false);
  });

  it('acepta hex con mayúsculas y rechaza longitudes o formato inválidos', () => {
    expect(DominantColorSchema.safeParse({ ...base, hex: '#aabbcc' }).success).toBe(true);
    expect(DominantColorSchema.safeParse({ ...base, hex: '#12345' }).success).toBe(false);
    expect(DominantColorSchema.safeParse({ ...base, hex: '112233' }).success).toBe(false);
    expect(DominantColorSchema.safeParse({ ...base, hex: '#GGHHII' }).success).toBe(false);
    expect(DominantColorSchema.safeParse({ ...base, hex: '' }).success).toBe(false);
  });
});

describe('GarmentPositionSchema y GarmentStatusSchema — enums cerrados', () => {
  it.each(['top', 'bottom', 'dress', 'footwear', 'outerwear', 'bag'])(
    'position acepta %s',
    value => {
      expect(GarmentPositionSchema.safeParse(value).success).toBe(true);
    }
  );

  it.each([null, '', 'Top', 'hat', 1])('position rechaza %s', value => {
    expect(GarmentPositionSchema.safeParse(value).success).toBe(false);
  });

  it.each(['AVAILABLE', 'LAUNDRY', 'REPAIR', 'INACTIVE'])('status acepta %s', value => {
    expect(GarmentStatusSchema.safeParse(value).success).toBe(true);
  });

  it.each([null, '', 'available', 'PENDING', 'UNKNOWN'])('status rechaza %s', value => {
    expect(GarmentStatusSchema.safeParse(value).success).toBe(false);
  });
});

describe('GarmentSummarySchema — bordes', () => {
  const base = {
    id: 'c1a1a1a1-1111-4111-8111-111111111111',
    processed_image_url: 'https://cdn.example.com/g.png',
    category: 'shirt',
    dominant_aesthetic: 'old_money',
  } as const;

  it('acepta el mínimo válido (position y status opcionales)', () => {
    expect(GarmentSummarySchema.safeParse(base).success).toBe(true);
    expect(
      GarmentSummarySchema.safeParse({ ...base, position: 'top', status: 'LAUNDRY' }).success
    ).toBe(true);
  });

  it('rechaza id no-uuid, url inválida o ausente', () => {
    expect(GarmentSummarySchema.safeParse({ ...base, id: 'x' }).success).toBe(false);
    expect(GarmentSummarySchema.safeParse({ ...base, processed_image_url: 'nope' }).success).toBe(
      false
    );
    const { processed_image_url: _omit, ...rest } = base;
    void _omit;
    expect(GarmentSummarySchema.safeParse(rest).success).toBe(false);
  });

  it('rechaza position o status fuera de sus enums', () => {
    expect(GarmentSummarySchema.safeParse({ ...base, position: 'hat' }).success).toBe(false);
    expect(GarmentSummarySchema.safeParse({ ...base, status: 'PENDING' }).success).toBe(false);
  });

  it('rechaza campos obligatorios ausentes (category y dominant_aesthetic)', () => {
    const { category: _c, ...noCategory } = base;
    void _c;
    expect(GarmentSummarySchema.safeParse(noCategory).success).toBe(false);
    const { dominant_aesthetic: _a, ...noAesthetic } = base;
    void _a;
    expect(GarmentSummarySchema.safeParse(noAesthetic).success).toBe(false);
  });
});

describe('CapsuleCatalogResponseSchema y GarmentsListResponseSchema — bordes', () => {
  it('aceptan listas vacías', () => {
    expect(CapsuleCatalogResponseSchema.safeParse({ garments: [] }).success).toBe(true);
    expect(GarmentsListResponseSchema.safeParse({ garments: [] }).success).toBe(true);
  });

  it('rechazan garments ausente o no-array', () => {
    expect(CapsuleCatalogResponseSchema.safeParse({}).success).toBe(false);
    expect(GarmentsListResponseSchema.safeParse({ garments: 'x' }).success).toBe(false);
  });

  it('rechazan una prenda inválida dentro de la lista (no solo en la raíz)', () => {
    const bad = {
      garments: [
        {
          id: 'c1a1a1a1-1111-4111-8111-111111111111',
          processed_image_url: 'https://cdn.example.com/g.png',
          category: 'shirt',
          dominant_aesthetic: 'old_money',
        },
        { id: 'nope', category: 'x' },
      ],
    };
    expect(CapsuleCatalogResponseSchema.safeParse(bad).success).toBe(false);
    expect(GarmentsListResponseSchema.safeParse(bad).success).toBe(false);
  });
});

describe('GarmentUploadResponseSchema — bordes de colecciones', () => {
  it('rechaza dominant_colors vacío (min 1)', () => {
    expect(
      GarmentUploadResponseSchema.safeParse({ ...garmentFixture, dominant_colors: [] }).success
    ).toBe(false);
  });

  it('rechaza top_aesthetics vacío (min 1 cuando está presente)', () => {
    expect(
      GarmentUploadResponseSchema.safeParse({ ...garmentFixture, top_aesthetics: [] }).success
    ).toBe(false);
  });

  it('acepta la respuesta sin top_aesthetics (opcional)', () => {
    const { top_aesthetics: _omit, ...rest } = garmentFixture as Record<string, unknown>;
    void _omit;
    expect(GarmentUploadResponseSchema.safeParse(rest).success).toBe(true);
  });

  it('rechaza position fuera del enum y processed_image_url ausente', () => {
    expect(
      GarmentUploadResponseSchema.safeParse({ ...garmentFixture, position: 'hat' }).success
    ).toBe(false);
    expect(
      GarmentUploadResponseSchema.safeParse({
        ...garmentFixture,
        position: 'dress',
        subcategory: 'midi dress',
      }).success
    ).toBe(true);
    const { processed_image_url: _omit, ...rest } = garmentFixture as Record<string, unknown>;
    void _omit;
    expect(GarmentUploadResponseSchema.safeParse(rest).success).toBe(false);
  });
});
