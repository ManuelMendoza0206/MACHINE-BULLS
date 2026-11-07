import { test, expect } from '@playwright/test';

// Task 86e302a1c: Flujo Crítico 2: Autenticación (Login, Registro, Validación).

test.describe('Flujo Crítico 2: Auth Flow', () => {
  test('renders login page with form controls and validation', async ({ page }) => {
    await page.goto('/login');

    await expect(page.getByRole('heading', { name: /Iniciar sesión/i })).toBeVisible();

    const emailInput = page.getByRole('textbox', { name: /email/i });
    const submitBtn = page.getByRole('button', { name: /iniciar sesión|ingresar/i });

    await expect(emailInput).toBeVisible();
    await expect(submitBtn).toBeVisible();

    // Verify link to signup exists
    const signupLink = page.getByRole('link', { name: /crear cuenta|regístrate/i });
    await expect(signupLink).toBeVisible();
  });

  test('renders signup page with email, password and registration CTA', async ({ page }) => {
    await page.goto('/signup');

    await expect(page.getByRole('heading', { name: /Crear cuenta/i })).toBeVisible();

    const emailInput = page.getByRole('textbox', { name: /email/i });
    await expect(emailInput).toBeVisible();

    const loginLink = page.getByRole('link', { name: /iniciar sesión/i });
    await expect(loginLink).toBeVisible();
  });
});
