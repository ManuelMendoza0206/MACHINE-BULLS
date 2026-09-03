import { z } from 'zod';

export const SignupFormSchema = z.object({
  name: z.string().min(2, 'Ingresa tu nombre'),
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'Mínimo 8 caracteres'),
});
export type SignupForm = z.infer<typeof SignupFormSchema>;

export const LoginFormSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'Ingresa tu contraseña'),
});
export type LoginForm = z.infer<typeof LoginFormSchema>;
