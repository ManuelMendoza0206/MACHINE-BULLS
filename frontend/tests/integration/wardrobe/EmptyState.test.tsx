import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { server } from '../../fixtures/msw/server';
import { renderWithProviders } from '../../utils/renderWithProviders';
import { WardrobeView } from '@/features/garments/components/WardrobeView';
import { usePhotoConsentStore } from '@/stores/photoConsentStore';

const originalEnv = process.env['NEXT_PUBLIC_API_BASE_URL'];

function garmentSummary(index: number): Record<string, string> {
  return {
    id: `00000000-0000-4000-8000-00000000000${index}`,
    processed_image_url: `https://res.cloudinary.com/styleme/garments/fixture-${String(index)}.webp`,
    category: 'shirt',
    dominant_aesthetic: 'old_money',
  };
}

beforeEach(() => {
  process.env['NEXT_PUBLIC_API_BASE_URL'] = 'https://api.example.com';
  usePhotoConsentStore.setState({ consentGiven: false });
});

afterEach(() => {
  if (originalEnv === undefined) {
    delete process.env['NEXT_PUBLIC_API_BASE_URL'];
  } else {
    process.env['NEXT_PUBLIC_API_BASE_URL'] = originalEnv;
  }
});

describe('Estado vacío de /wardrobe', () => {
  it('con 0 prendas, muestra el EmptyState con ambos CTAs', async () => {
    server.use(http.get('*/api/v1/garments', () => HttpResponse.json({ garments: [] })));
    renderWithProviders(<WardrobeView />);

    expect(await screen.findByText(/tu armario todavía está vacío/i)).toBeInTheDocument();
    // CTA 1: entrada al flujo de subida (gateada por el consentimiento de fotos).
    expect(screen.getByRole('button', { name: /acepto/i })).toBeInTheDocument();
    // CTA 2: enlace al catálogo cápsula.
    expect(screen.getByRole('link', { name: /catálogo cápsula/i })).toHaveAttribute(
      'href',
      '/wardrobe/capsule'
    );
  });

  it('con 5 prendas, no muestra el EmptyState', async () => {
    const handlerCalled = vi.fn();
    const garments = [1, 2, 3, 4, 5].map(garmentSummary);
    server.use(
      http.get('*/api/v1/garments', () => {
        handlerCalled();
        return HttpResponse.json({ garments });
      })
    );
    renderWithProviders(<WardrobeView />);

    // La vista actual (toggle de secciones) sigue montada de inmediato...
    expect(screen.getByRole('group', { name: /sección del armario/i })).toBeInTheDocument();
    // ...y una vez que el listado de 5 prendas resuelve, el EmptyState nunca aparece.
    await waitFor(() => expect(handlerCalled).toHaveBeenCalled());
    expect(screen.queryByText(/tu armario todavía está vacío/i)).not.toBeInTheDocument();
  });
});
