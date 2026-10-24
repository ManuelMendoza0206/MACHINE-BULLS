import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../utils/renderWithProviders';
import { server } from '../../fixtures/msw/server';
import recommendFixture from '../../fixtures/api/outfitRecommendationResponse.json';
import capsuleFixture from '../../fixtures/api/capsuleCatalogResponse.json';
import { OutfitsView } from '@/features/outfits/components/OutfitsView';

const ME_UUID = 'aaaaaaaa-4567-4891-8901-abcdef123456';

const { push } = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));

const originalEnv = process.env['NEXT_PUBLIC_API_BASE_URL'];

beforeEach(() => {
  process.env['NEXT_PUBLIC_API_BASE_URL'] = 'https://api.example.com';
  push.mockClear();
  server.use(
    http.get('*/api/v1/me', () =>
      HttpResponse.json({ user_id: ME_UUID, email: 'demo@styleme.test' })
    ),
    http.post('*/api/v1/outfits/recommend', () => HttpResponse.json(recommendFixture)),
    http.get('*/api/v1/garments/capsule', () => HttpResponse.json(capsuleFixture))
  );
});

afterEach(() => {
  if (originalEnv === undefined) {
    delete process.env['NEXT_PUBLIC_API_BASE_URL'];
  } else {
    process.env['NEXT_PUBLIC_API_BASE_URL'] = originalEnv;
  }
});

describe('OutfitsView', () => {
  it('lista los outfits con sus scores y navega al probador', async () => {
    renderWithProviders(<OutfitsView />);

    const cta = await screen.findByRole('button', { name: /probar puesto/i });
    // Scores del fixture: 0.92 cromático / 0.87 de embedding → porcentajes redondeados.
    expect(screen.getByText('92%')).toBeInTheDocument();
    expect(screen.getByText('87%')).toBeInTheDocument();
    // Sin match de ids en el catálogo, la prenda cae al label de posición (causa legible).
    expect(screen.getByText('Parte superior')).toBeInTheDocument();

    await userEvent.click(cta);
    expect(push).toHaveBeenCalledWith('/try-on?outfit=8c7f8b1a-1234-4567-8901-abcdef123456');
  });

  it('un 400 del backend muestra el detalle del servidor, no un vacío genérico', async () => {
    server.use(
      http.post('*/api/v1/outfits/recommend', () =>
        HttpResponse.json({ detail: 'Falta calzado en tu armario' }, { status: 400 })
      )
    );

    renderWithProviders(<OutfitsView />);

    expect(await screen.findByText('Falta calzado en tu armario')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /completar el armario/i })).toBeInTheDocument();
  });

  it('armario vacío distingue la causa raíz y ofrece subir prendas', async () => {
    server.use(
      http.get('*/api/v1/garments/capsule', () => HttpResponse.json({ garments: [] })),
      http.post('*/api/v1/outfits/recommend', () =>
        HttpResponse.json({ detail: 'el usuario no tiene prendas' }, { status: 400 })
      )
    );

    renderWithProviders(<OutfitsView />);

    expect(await screen.findByText('Tu armario está vacío')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /subir prendas/i })).toBeInTheDocument();
  });
});
