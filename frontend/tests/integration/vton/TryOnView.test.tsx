import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../utils/renderWithProviders';
import { server } from '../../fixtures/msw/server';
import recommendFixture from '../../fixtures/api/outfitRecommendationResponse.json';
import capsuleFixture from '../../fixtures/api/capsuleCatalogResponse.json';
import { TryOnView } from '@/features/vton/components/TryOnView';
import { clearCachedVtonResult } from '@/features/vton/lib/checkCachedVtonResult';
import { usePhotoConsentStore } from '@/stores/photoConsentStore';

const JOB_UUID = '9b1deb4d-3b7d-4567-8901-2b0d7b3dcb6d';

const { push, outfitId } = vi.hoisted(() => ({
  push: vi.fn(),
  outfitId: '8c7f8b1a-1234-4567-8901-abcdef123456',
}));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
  useSearchParams: () => new URLSearchParams(`outfit=${outfitId}`),
}));

const originalEnv = process.env['NEXT_PUBLIC_API_BASE_URL'];

function happyHandlers(): void {
  server.use(
    http.get('*/api/v1/outfits/:id', () => HttpResponse.json(recommendFixture.outfits[0])),
    http.post('*/api/v1/outfits/recommend', () => HttpResponse.json(recommendFixture)),
    http.get('*/api/v1/garments/capsule', () => HttpResponse.json(capsuleFixture)),
    http.post('*/api/v1/vton/try-on', () =>
      HttpResponse.json({ job_id: JOB_UUID, status: 'processing', estimated_time_seconds: 1 })
    ),
    http.get('*/api/v1/vton/status/:id', () =>
      HttpResponse.json({
        job_id: JOB_UUID,
        status: 'completed',
        result_url: 'https://cdn.example.com/result.jpg',
      })
    )
  );
}

async function uploadPhoto(): Promise<void> {
  const input = await screen.findByLabelText(/seleccionar fotos/i);
  const file = new File(['dummy-bytes'], 'yo.png', { type: 'image/png' });
  await userEvent.upload(input, file);
}

beforeEach(() => {
  process.env['NEXT_PUBLIC_API_BASE_URL'] = 'https://api.example.com';
  push.mockClear();
  clearCachedVtonResult();
  usePhotoConsentStore.setState({ consentGiven: true });
  happyHandlers();
});

afterEach(() => {
  if (originalEnv === undefined) {
    delete process.env['NEXT_PUBLIC_API_BASE_URL'];
  } else {
    process.env['NEXT_PUBLIC_API_BASE_URL'] = originalEnv;
  }
});

describe('TryOnView', () => {
  it('genera la prueba virtual y muestra el resultado accionable', async () => {
    renderWithProviders(<TryOnView />);

    expect(await screen.findByRole('heading', { name: /outfit a probar/i })).toBeInTheDocument();
    await uploadPhoto();

    await userEvent.click(await screen.findByRole('button', { name: /generar prueba virtual/i }));

    const resultado = await screen.findByAltText(
      /resultado de la prueba virtual/i,
      {},
      { timeout: 4_000 }
    );
    expect(resultado).toBeInTheDocument();

    const guardar = screen.getByRole('link', { name: /guardar imagen/i });
    expect(guardar).toHaveAttribute('href', 'https://cdn.example.com/result.jpg');
    expect(screen.getByRole('button', { name: /probar con otra foto/i })).toBeInTheDocument();
  });

  it('un doble click dispara una sola creación de job', async () => {
    let postCount = 0;
    server.use(
      http.post('*/api/v1/vton/try-on', () => {
        postCount += 1;
        return HttpResponse.json({
          job_id: JOB_UUID,
          status: 'processing',
          estimated_time_seconds: 1,
        });
      })
    );

    renderWithProviders(<TryOnView />);
    await uploadPhoto();

    const btn = await screen.findByRole('button', { name: /generar prueba virtual/i });
    await userEvent.click(btn);
    await userEvent.click(btn);

    expect(postCount).toBe(1);
  });

  it('un job fallido muestra el mensaje de negocio del backend', async () => {
    server.use(
      http.get('*/api/v1/vton/status/:id', () =>
        HttpResponse.json({
          job_id: JOB_UUID,
          status: 'failed',
          error_message: 'No se detectó una pose corporal válida en la imagen.',
        })
      )
    );

    renderWithProviders(<TryOnView />);
    await uploadPhoto();
    await userEvent.click(await screen.findByRole('button', { name: /generar prueba virtual/i }));

    expect(
      await screen.findByText(
        'No se detectó una pose corporal válida en la imagen.',
        {},
        {
          timeout: 4_000,
        }
      )
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /probar con otra foto/i })).toBeInTheDocument();
  });

  it('checkCachedVtonResult evita una llamada de red duplicada para el mismo par (outfit, foto) en la misma sesión', async () => {
    let tryOnPostCount = 0;
    server.use(
      http.post('*/api/v1/vton/try-on', () => {
        tryOnPostCount += 1;
        return HttpResponse.json({
          job_id: JOB_UUID,
          status: 'processing',
          estimated_time_seconds: 1,
        });
      })
    );

    renderWithProviders(<TryOnView />);

    // Primera prueba con la foto
    await uploadPhoto();
    await userEvent.click(await screen.findByRole('button', { name: /generar prueba virtual/i }));

    // Esperar a que resuelva y muestre el resultado
    expect(
      await screen.findByAltText(/resultado de la prueba virtual/i, {}, { timeout: 4_000 })
    ).toBeInTheDocument();
    expect(tryOnPostCount).toBe(1);

    // Usuario resetea la foto
    await userEvent.click(screen.getByRole('button', { name: /probar con otra foto/i }));

    // Vuelve a subir la misma foto en la misma sesión
    await uploadPhoto();
    await userEvent.click(await screen.findByRole('button', { name: /generar prueba virtual/i }));

    // El resultado aparece de inmediato desde caché sin disparar un segundo POST
    expect(
      await screen.findByAltText(/resultado de la prueba virtual/i, {}, { timeout: 4_000 })
    ).toBeInTheDocument();
    expect(tryOnPostCount).toBe(1);
  });
});
