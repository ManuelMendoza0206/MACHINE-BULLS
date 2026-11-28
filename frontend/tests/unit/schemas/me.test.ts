import { describe, it, expect } from 'vitest';
import { MeResponseSchema } from '@/schemas/api/me';

// E2-T10 — /me alimenta a OutfitsView, TryOnView y ProfileView: si el backend
// cambia el shape, la vista debe degradar a un estado de error tipado, no crashear.
describe('MeResponseSchema', () => {
  it('parses the documented identity shape', () => {
    expect(
      MeResponseSchema.safeParse({
        user_id: 'aaaaaaaa-4567-4891-8901-abcdef123456',
        email: 'demo@styleme.test',
      }).success
    ).toBe(true);
  });

  it.each([
    ['user_id no-uuid', { user_id: 'user-1', email: 'demo@styleme.test' }],
    ['email inválido', { user_id: 'aaaaaaaa-4567-4891-8901-abcdef123456', email: 'no-email' }],
    ['email vacío', { user_id: 'aaaaaaaa-4567-4891-8901-abcdef123456', email: '' }],
    ['email null', { user_id: 'aaaaaaaa-4567-4891-8901-abcdef123456', email: null }],
    ['user_id null', { user_id: null, email: 'demo@styleme.test' }],
    ['user_id vacío', { user_id: '', email: 'demo@styleme.test' }],
  ])('rechaza %s', (_label, payload) => {
    expect(MeResponseSchema.safeParse(payload).success).toBe(false);
  });

  it('rechaza campos ausentes', () => {
    expect(MeResponseSchema.safeParse({}).success).toBe(false);
    expect(
      MeResponseSchema.safeParse({ user_id: 'aaaaaaaa-4567-4891-8901-abcdef123456' }).success
    ).toBe(false);
    expect(MeResponseSchema.safeParse({ email: 'demo@styleme.test' }).success).toBe(false);
  });

  it('tolera campos extra (p.ej. preferred_aesthetic) sin romper el parseo', () => {
    const result = MeResponseSchema.safeParse({
      user_id: 'aaaaaaaa-4567-4891-8901-abcdef123456',
      email: 'demo@styleme.test',
      preferred_aesthetic: 'casual',
      is_admin: true,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).not.toHaveProperty('preferred_aesthetic');
      expect(result.data.email).toBe('demo@styleme.test');
    }
  });
});
