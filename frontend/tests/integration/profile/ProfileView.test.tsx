import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../../utils/renderWithProviders';
import { server } from '../../fixtures/msw/server';
import capsuleFixture from '../../fixtures/api/capsuleCatalogResponse.json';
import { ProfileView } from '@/features/profile/components/ProfileView';

const originalEnv = process.env['NEXT_PUBLIC_API_BASE_URL'];

beforeEach(() => {
  process.env['NEXT_PUBLIC_API_BASE_URL'] = 'https://api.example.com';
  server.use(
    http.get('*/api/v1/me', () =>
      HttpResponse.json({
        user_id: 'aaaaaaaa-4567-4891-8901-abcdef123456',
        email: 'demo@styleme.test',
      })
    ),
    http.get('*/api/v1/garments/capsule', () => HttpResponse.json(capsuleFixture)),
    http.get('*/health', () => HttpResponse.json({ status: 'ok', vton_provider: 'mock' }))
  );
});

afterEach(() => {
  if (originalEnv === undefined) {
    delete process.env['NEXT_PUBLIC_API_BASE_URL'];
  } else {
    process.env['NEXT_PUBLIC_API_BASE_URL'] = originalEnv;
  }
});

describe('ProfileView', () => {
  it('muestra identidad, stats del armario y el proveedor VTON activo', async () => {
    renderWithProviders(<ProfileView />);

    expect(await screen.findByText('demo@styleme.test')).toBeInTheDocument();
    // Stats derivadas del fixture capsule (3 prendas: top/bottom/footwear).
    expect(screen.getByText('Prendas digitizadas')).toBeInTheDocument();
    expect(screen.getByText('Parte superior')).toBeInTheDocument();
    // Proveedor VTON desde /health — clave para la demo (mock hoy, VM mañana).
    expect(await screen.findByTestId('vton-provider')).toHaveTextContent('mock');
    expect(screen.getByText(/openai\/clip-vit-base-patch32/)).toBeInTheDocument();
  });

  it('ofrece cerrar sesión', async () => {
    renderWithProviders(<ProfileView />);
    expect(await screen.findByRole('button', { name: /cerrar sesión/i })).toBeInTheDocument();
  });
});
