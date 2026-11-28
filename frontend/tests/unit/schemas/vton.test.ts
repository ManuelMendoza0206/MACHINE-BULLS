import { describe, it, expect } from 'vitest';
import {
  VtonJobStatusSchema,
  VtonJobCreateResponseSchema,
  VtonJobStatusResponseSchema,
  VtonGarmentLayerSchema,
  VtonMultilayerRequestSchema,
  VtonJobListItemSchema,
  VtonJobListResponseSchema,
} from '@/schemas/api/vton';
import createFixture from '../../fixtures/api/vtonJobCreateResponse.json';
import statusFixtures from '../../fixtures/api/vtonJobStatusResponse.json';

describe('VtonJobStatusSchema', () => {
  it('accepts closed enum', () => {
    expect(VtonJobStatusSchema.safeParse('pending').success).toBe(true);
    expect(VtonJobStatusSchema.safeParse('completed').success).toBe(true);
    expect(VtonJobStatusSchema.safeParse('unknown').success).toBe(false);
  });
});

describe('VtonJobCreateResponseSchema', () => {
  it('parses valid fixture', () => {
    expect(VtonJobCreateResponseSchema.safeParse(createFixture).success).toBe(true);
  });

  it('fails when status is not processing', () => {
    expect(
      VtonJobCreateResponseSchema.safeParse({ ...createFixture, status: 'pending' }).success
    ).toBe(false);
  });
});

describe('VtonJobStatusResponseSchema', () => {
  it('parses processing without result_url', () => {
    expect(VtonJobStatusResponseSchema.safeParse(statusFixtures.processing).success).toBe(true);
  });

  it('parses completed with result_url', () => {
    expect(VtonJobStatusResponseSchema.safeParse(statusFixtures.completed).success).toBe(true);
  });

  it('parses failed with error_message', () => {
    expect(VtonJobStatusResponseSchema.safeParse(statusFixtures.failed).success).toBe(true);
  });

  it('fails refine: completed without result_url', () => {
    const bad = { ...statusFixtures.completed, result_url: null };
    const result = VtonJobStatusResponseSchema.safeParse(bad);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some(i => i.path.join('.') === 'result_url')).toBe(true);
    }
  });

  it('fails when job_id is not uuid', () => {
    expect(
      VtonJobStatusResponseSchema.safeParse({ ...statusFixtures.processing, job_id: 'bad' }).success
    ).toBe(false);
  });
});

// E2-T10 — bordes de enums, nulls, strings vacíos y campos faltantes.
describe('VtonJobStatusSchema — bordes del enum cerrado', () => {
  it.each(['pending', 'processing', 'completed', 'failed'])('acepta %s', value => {
    expect(VtonJobStatusSchema.safeParse(value).success).toBe(true);
  });

  it.each([null, undefined, '', 'Pending', 'COMPLETED', 'done', 0])(
    'rechaza el valor no-pertinente %s',
    value => {
      expect(VtonJobStatusSchema.safeParse(value).success).toBe(false);
    }
  );
});

describe('VtonJobCreateResponseSchema — bordes', () => {
  it('rechaza job_id que no es uuid', () => {
    expect(
      VtonJobCreateResponseSchema.safeParse({ ...createFixture, job_id: 'job-123' }).success
    ).toBe(false);
  });

  it('rechaza estimated_time_seconds cero o negativo', () => {
    expect(
      VtonJobCreateResponseSchema.safeParse({ ...createFixture, estimated_time_seconds: 0 }).success
    ).toBe(false);
    expect(
      VtonJobCreateResponseSchema.safeParse({ ...createFixture, estimated_time_seconds: -5 })
        .success
    ).toBe(false);
  });

  it('rechaza estimated_time_seconds ausente o no-numérico', () => {
    const { estimated_time_seconds: _omit, ...rest } = createFixture as Record<string, unknown>;
    void _omit;
    expect(VtonJobCreateResponseSchema.safeParse(rest).success).toBe(false);
    expect(
      VtonJobCreateResponseSchema.safeParse({ ...createFixture, estimated_time_seconds: '12' })
        .success
    ).toBe(false);
  });

  it('rechaza cualquier status distinto de "processing"', () => {
    expect(
      VtonJobCreateResponseSchema.safeParse({ ...createFixture, status: 'completed' }).success
    ).toBe(false);
    expect(VtonJobCreateResponseSchema.safeParse({ ...createFixture, status: null }).success).toBe(
      false
    );
  });

  it('tolera campos desconocidos del backend (strip, no error)', () => {
    const withExtra = { ...createFixture, queue_position: 3 };
    const result = VtonJobCreateResponseSchema.safeParse(withExtra);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).not.toHaveProperty('queue_position');
  });
});

describe('VtonJobStatusResponseSchema — bordes', () => {
  it('rechaza completed con result_url vacío (refine)', () => {
    const result = VtonJobStatusResponseSchema.safeParse({
      ...statusFixtures.completed,
      result_url: '',
    });
    expect(result.success).toBe(false);
  });

  it('rechaza completed sin result_url presente', () => {
    const { result_url: _omit, ...rest } = statusFixtures.completed as Record<string, unknown>;
    void _omit;
    expect(VtonJobStatusResponseSchema.safeParse(rest).success).toBe(false);
  });

  it('rechaza result_url que no es URL válida', () => {
    expect(
      VtonJobStatusResponseSchema.safeParse({
        ...statusFixtures.completed,
        result_url: 'not-a-url',
      }).success
    ).toBe(false);
  });

  it('acepta failed sin ningún error_message (campo opcional)', () => {
    const { error_message: _omit, ...rest } = statusFixtures.failed as Record<string, unknown>;
    void _omit;
    expect(VtonJobStatusResponseSchema.safeParse(rest).success).toBe(true);
  });

  it('rechaza error_message de tipo no-string', () => {
    expect(
      VtonJobStatusResponseSchema.safeParse({
        ...statusFixtures.failed,
        error_message: 42,
      }).success
    ).toBe(false);
  });

  it('rechaza status desconocido o nulo (enum cerrado)', () => {
    expect(
      VtonJobStatusResponseSchema.safeParse({
        ...statusFixtures.processing,
        status: 'queued',
      }).success
    ).toBe(false);
    expect(
      VtonJobStatusResponseSchema.safeParse({
        ...statusFixtures.processing,
        status: null,
      }).success
    ).toBe(false);
  });

  it('rechaza job_id ausente', () => {
    const { job_id: _omit, ...rest } = statusFixtures.processing as Record<string, unknown>;
    void _omit;
    expect(VtonJobStatusResponseSchema.safeParse(rest).success).toBe(false);
  });
});

describe('VtonMultilayerRequestSchema / VtonGarmentLayerSchema — bordes', () => {
  const layer = {
    garment_id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
    position: 'top',
  } as const;

  it('acepta de 1 a 4 capas', () => {
    expect(VtonMultilayerRequestSchema.safeParse({ garment_layers: [layer] }).success).toBe(true);
    expect(
      VtonMultilayerRequestSchema.safeParse({
        garment_layers: Array.from({ length: 6 }, () => layer),
      }).success
    ).toBe(true);
  });

  it('rechaza 0 capas (min 1) y 7 capas (max 6)', () => {
    expect(VtonMultilayerRequestSchema.safeParse({ garment_layers: [] }).success).toBe(false);
    expect(
      VtonMultilayerRequestSchema.safeParse({
        garment_layers: Array.from({ length: 7 }, () => layer),
      }).success
    ).toBe(false);
  });

  it('rechaza position fuera del enum y garment_id que no es uuid', () => {
    expect(VtonGarmentLayerSchema.safeParse({ ...layer, position: 'dress' }).success).toBe(true);
    expect(VtonGarmentLayerSchema.safeParse({ ...layer, position: 'hat' }).success).toBe(false);
    expect(VtonGarmentLayerSchema.safeParse({ ...layer, position: 'TOP' }).success).toBe(false);
    expect(VtonGarmentLayerSchema.safeParse({ ...layer, garment_id: 'x' }).success).toBe(false);
    expect(VtonGarmentLayerSchema.safeParse({ ...layer, position: null }).success).toBe(false);
  });

  it('rechaza garment_layers ausente o no-array', () => {
    expect(VtonMultilayerRequestSchema.safeParse({}).success).toBe(false);
    expect(VtonMultilayerRequestSchema.safeParse({ garment_layers: 'top' }).success).toBe(false);
  });
});

describe('VtonJobListItemSchema / VtonJobListResponseSchema — bordes', () => {
  const item = {
    job_id: '5d8f1e2a-1234-4567-8901-abcdef123456',
    status: 'pending',
    created_at: '2026-11-07T12:00:00Z',
  };

  it('acepta la lista vacía con total 0', () => {
    expect(VtonJobListResponseSchema.safeParse({ jobs: [], total: 0 }).success).toBe(true);
  });

  it('acepta un item mínimo (outfit_id, stage, result_url y error_message opcionales)', () => {
    expect(VtonJobListItemSchema.safeParse(item).success).toBe(true);
  });

  it('rechaza total negativo o no-entero', () => {
    expect(VtonJobListResponseSchema.safeParse({ jobs: [], total: -1 }).success).toBe(false);
    expect(VtonJobListResponseSchema.safeParse({ jobs: [], total: 1.5 }).success).toBe(false);
  });

  it('rechaza jobs no-array y total ausente', () => {
    expect(VtonJobListResponseSchema.safeParse({ jobs: 'x', total: 1 }).success).toBe(false);
    expect(VtonJobListResponseSchema.safeParse({ jobs: [] }).success).toBe(false);
  });

  it('rechaza un item con status fuera del enum o created_at ausente', () => {
    expect(VtonJobListItemSchema.safeParse({ ...item, status: 'running' }).success).toBe(false);
    const { created_at: _omit, ...rest } = item;
    void _omit;
    expect(VtonJobListItemSchema.safeParse(rest).success).toBe(false);
  });

  it('rechaza un result_url que no es una URL parseable', () => {
    expect(VtonJobListItemSchema.safeParse({ ...item, result_url: 'no-es-url' }).success).toBe(
      false
    );
    // z.string().url() valida parseo, no esquema — cualquier scheme absoluto pasa.
    expect(
      VtonJobListItemSchema.safeParse({ ...item, result_url: 'ftp://cdn/x.jpg' }).success
    ).toBe(true);
  });
});
