import { describe, it, expect } from 'vitest';
import {
  VtonJobStatusSchema,
  VtonJobCreateResponseSchema,
  VtonJobStatusResponseSchema,
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
