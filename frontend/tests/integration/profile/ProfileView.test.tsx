import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../utils/renderWithProviders';
import { server } from '../../fixtures/msw/server';
import capsuleFixture from '../../fixtures/api/capsuleCatalogResponse.json';
import { ProfileView } from '@/features/profile/components/ProfileView';
import { usePhotoConsentStore } from '@/stores/photoConsentStore';

const originalEnv = process.env['NEXT_PUBLIC_API_BASE_URL'];

beforeEach(() => {
  process.env['NEXT_PUBLIC_API_BASE_URL'] = 'https://api.example.com';
  usePhotoConsentStore.setState({ consentGiven: true, consentByUser: {} });
  server.use(
    http.get('*/api/v1/me', () =>
      HttpResponse.json({
        user_id: 'aaaaaaaa-4567-4891-8901-abcdef123456',
        email: 'demo@styleme.test',
      })
    ),
    http.get('*/api/v1/garments', () => HttpResponse.json(capsuleFixture)),
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
    // El total mostrado es `garments.length`, no solo la etiqueta (E0-T5):
    // si la vista dejara de renderizar el conteo, este assert falla.
    const totalEl = screen.getByText('Prendas digitizadas').nextElementSibling;
    expect(totalEl).toHaveTextContent(/^3$/);
    expect(screen.getByText('Parte superior')).toBeInTheDocument();
    // Proveedor VTON desde /health — clave para la demo (mock hoy, VM mañana).
    expect(await screen.findByTestId('vton-provider')).toHaveTextContent('mock');
    expect(screen.getByText(/openai\/clip-vit-base-patch32/)).toBeInTheDocument();
  });

  it('ofrece cerrar sesión', async () => {
    renderWithProviders(<ProfileView />);
    expect(await screen.findByRole('button', { name: /cerrar sesión/i })).toBeInTheDocument();
  });

  it('permite subir y eliminar la foto privada por defecto para el probador virtual', async () => {
    server.use(
      http.post('*/api/v1/me/vton-photo', () =>
        HttpResponse.json({
          user_id: 'aaaaaaaa-4567-4891-8901-abcdef123456',
          email: 'demo@styleme.test',
          has_default_vton_photo: true,
          default_vton_photo_url: 'https://cdn.example.com/usuarios/foto-default.jpg',
        })
      ),
      http.delete('*/api/v1/me/vton-photo', () =>
        HttpResponse.json({
          user_id: 'aaaaaaaa-4567-4891-8901-abcdef123456',
          email: 'demo@styleme.test',
          has_default_vton_photo: false,
          default_vton_photo_url: null,
        })
      )
    );

    renderWithProviders(<ProfileView />);

    expect(await screen.findByText(/solo tuya · privada/i)).toBeInTheDocument();
    const input = await screen.findByLabelText(/seleccionar foto corporal por defecto/i);
    const file = new File(['img-bytes'], 'mi-cuerpo.jpg', { type: 'image/jpeg' });
    await userEvent.upload(input, file);

    expect(await screen.findByText(/foto por defecto activa/i)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /eliminar foto guardada/i }));
    expect(await screen.findByText(/sube tu foto base de cuerpo completo/i)).toBeInTheDocument();
  });
});
