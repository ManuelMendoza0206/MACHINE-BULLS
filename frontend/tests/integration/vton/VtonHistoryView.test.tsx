import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../utils/renderWithProviders';
import { server } from '../../fixtures/msw/server';
import { VtonHistoryView } from '@/features/vton/components/VtonHistoryView';

const originalEnv = process.env['NEXT_PUBLIC_API_BASE_URL'];

const MOCK_JOBS_RESPONSE = {
  jobs: [
    {
      job_id: '9b1deb4d-3b7d-4567-8901-2b0d7b3dcb6d',
      outfit_id: '8c7f8b1a-1234-4567-8901-abcdef123456',
      status: 'completed',
      stage: 'completed',
      result_url: 'https://cdn.example.com/vton/result1.jpg',
      error_message: null,
      created_at: '2026-10-30T15:30:00Z',
    },
    {
      job_id: 'a23deb4d-3b7d-4567-8901-2b0d7b3dcb7e',
      outfit_id: null,
      status: 'failed',
      stage: 'failed',
      result_url: null,
      error_message: 'Foto sin pose detectable',
      created_at: '2026-10-29T12:00:00Z',
    },
  ],
  total: 2,
};

beforeEach(() => {
  process.env['NEXT_PUBLIC_API_BASE_URL'] = 'https://api.example.com';
});

afterEach(() => {
  process.env['NEXT_PUBLIC_API_BASE_URL'] = originalEnv;
});

describe('VtonHistoryView', () => {
  it('renderiza empty state cuando el usuario no tiene pruebas virtuales', async () => {
    server.use(
      http.get('*/api/v1/vton/jobs', () =>
        HttpResponse.json({
          jobs: [],
          total: 0,
        })
      )
    );

    renderWithProviders(<VtonHistoryView />);

    expect(
      await screen.findByText(/aún no realizaste ninguna prueba virtual/i)
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /ir al probador/i })).toHaveAttribute(
      'href',
      '/try-on'
    );
  });

  it('renderiza la lista de jobs con badge de estado, fecha y opciones', async () => {
    server.use(http.get('*/api/v1/vton/jobs', () => HttpResponse.json(MOCK_JOBS_RESPONSE)));

    renderWithProviders(<VtonHistoryView />);

    // Verifica que aparezcan los badges de estado
    expect(await screen.findByText('Completado')).toBeInTheDocument();
    expect(screen.getByText('Falló')).toBeInTheDocument();

    // Verifica mensaje de error en el job fallido
    expect(screen.getByText(/foto sin pose detectable/i)).toBeInTheDocument();

    // Verifica imagen en el job completado
    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('src', 'https://cdn.example.com/vton/result1.jpg');

    // Verifica links de acción
    expect(screen.getByRole('link', { name: /ver outfit/i })).toHaveAttribute(
      'href',
      '/outfits?outfit=8c7f8b1a-1234-4567-8901-abcdef123456'
    );
  });

  it('muestra mensaje de error si falla la consulta y permite reintentar', async () => {
    let attempts = 0;
    server.use(
      http.get('*/api/v1/vton/jobs', () => {
        attempts++;
        if (attempts === 1) {
          return new HttpResponse(null, { status: 500 });
        }
        return HttpResponse.json(MOCK_JOBS_RESPONSE);
      })
    );

    renderWithProviders(<VtonHistoryView />);

    expect(
      await screen.findByText(/no pudimos cargar el historial de pruebas/i)
    ).toBeInTheDocument();

    const retryBtn = screen.getByRole('button', { name: /reintentar/i });
    await userEvent.click(retryBtn);

    expect(await screen.findByText('Completado')).toBeInTheDocument();
  });
});
