import { describe, it, expect } from 'vitest';
import { LoginFormSchema, SignupFormSchema } from '@/schemas/auth';

describe('SignupFormSchema', () => {
  it('parses valid signup', () => {
    expect(
      SignupFormSchema.safeParse({ name: 'Ana', email: 'ana@example.com', password: 'password123' })
        .success
    ).toBe(true);
  });

  it('fails when name too short', () => {
    const result = SignupFormSchema.safeParse({
      name: 'A',
      email: 'a@b.com',
      password: 'password123',
    });
    expect(result.success).toBe(false);
  });

  it('fails when email invalid', () => {
    expect(
      SignupFormSchema.safeParse({ name: 'Ana', email: 'no-email', password: 'password123' })
        .success
    ).toBe(false);
  });

  it('fails when password < 8 chars', () => {
    expect(
      SignupFormSchema.safeParse({ name: 'Ana', email: 'ana@b.com', password: 'short' }).success
    ).toBe(false);
  });
});

describe('LoginFormSchema', () => {
  it('parses valid login', () => {
    expect(LoginFormSchema.safeParse({ email: 'ana@b.com', password: 'x' }).success).toBe(true);
  });

  it('fails when email invalid', () => {
    expect(LoginFormSchema.safeParse({ email: 'bad', password: 'x' }).success).toBe(false);
  });

  it('fails when password empty', () => {
    expect(LoginFormSchema.safeParse({ email: 'a@b.com', password: '' }).success).toBe(false);
  });
});
