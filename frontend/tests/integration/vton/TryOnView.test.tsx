import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { mswError, mswNetworkError } from '../../utils/http';
import { screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../utils/renderWithProviders';
import { server } from '../../fixtures/msw/server';
import { restoreVisibilityState, setVisibilityState } from '../../utils/visibility';
import recommendFixture from '../../fixtures/api/outfitRecommendationResponse.json';
import capsuleFixture from '../../fixtures/api/capsuleCatalogResponse.json';
import { TryOnView } from '@/features/vton/components/TryOnView';
import { clearCachedVtonResult } from '@/features/vton/lib/checkCachedVtonResult';
import { usePhotoConsentStore } from '@/stores/photoConsentStore';

const JOB_UUID = '9b1deb4d-3b7d-4567-8901-2b0d7b3dcb6d';
const DEFAULT_OUTFIT_ID = '8c7f8b1a-1234-4567-8901-abcdef123456';

// Estado mutable compartido con el mock de `next/navigation`: cada test puede cambiar
// `outfitId` para simular query `?outfit=` ausente o inválida (E2-T12).
const nav = vi.hoisted(() => ({
  push: vi.fn(),
  outfitId: '8c7f8b1a-1234-4567-8901-abcdef123456',
  garmentId: '',
  position: '',
  image: '',
}));
const push = nav.push;
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: nav.push }),
  useSearchParams: () => {
    const params = new URLSearchParams();
    if (nav.outfitId) params.set('outfit', nav.outfitId);
    if (nav.garmentId) params.set('garment', nav.garmentId);
    if (nav.position) params.set('position', nav.position);
    if (nav.image) params.set('image', nav.image);
    return params;
  },
}));

const originalEnv = process.env['NEXT_PUBLIC_API_BASE_URL'];
const originalTimeoutEnv = process.env['NEXT_PUBLIC_VTON_POLL_TIMEOUT_MS'];

function happyHandlers(): void {
  server.use(
    http.get('*/api/v1/outfits/:id', () => HttpResponse.json(recommendFixture.outfits[0])),
    http.post('*/api/v1/outfits/recommend', () => HttpResponse.json(recommendFixture)),
    http.get('*/api/v1/garments/capsule', () => HttpResponse.json(capsuleFixture)),
    http.get('*/api/v1/me/canonical-photo', () =>
      HttpResponse.json({ has_canonical: false, photo_url: null })
    ),
    http.get('*/api/v1/vton/:id/download', () =>
      HttpResponse.arrayBuffer(new ArrayBuffer(8), {
        headers: { 'Content-Type': 'image/jpeg' },
      })
    ),
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
  nav.outfitId = DEFAULT_OUTFIT_ID;
  nav.garmentId = '';
  nav.position = '';
  nav.image = '';
  clearCachedVtonResult();
  usePhotoConsentStore.setState({ consentGiven: true });
  happyHandlers();
});

afterEach(() => {
  vi.unstubAllGlobals();
  if (originalEnv === undefined) {
    delete process.env['NEXT_PUBLIC_API_BASE_URL'];
  } else {
    process.env['NEXT_PUBLIC_API_BASE_URL'] = originalEnv;
  }
  if (originalTimeoutEnv === undefined) {
    delete process.env['NEXT_PUBLIC_VTON_POLL_TIMEOUT_MS'];
  } else {
    process.env['NEXT_PUBLIC_VTON_POLL_TIMEOUT_MS'] = originalTimeoutEnv;
  }
  restoreVisibilityState();
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

    const guardar = screen.getByRole('button', { name: /guardar imagen/i });
    expect(guardar).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /compartir look/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /probar con otra foto/i })).toBeInTheDocument();
  });

  it('reutiliza la foto canónica sin volver a subir un archivo', async () => {
    let captured: FormData | undefined;
    server.use(
      http.get('*/api/v1/me/canonical-photo', () =>
        HttpResponse.json({
          has_canonical: true,
          photo_url: 'https://api.example.com/media/humans/u/canonical.jpg',
        })
      ),
      http.post('*/api/v1/vton/try-on', async ({ request }) => {
        captured = await request.formData();
        return HttpResponse.json({
          job_id: JOB_UUID,
          status: 'processing',
          estimated_time_seconds: 1,
        });
      })
    );

    renderWithProviders(<TryOnView />);

    await userEvent.click(await screen.findByRole('button', { name: /^usar$/i }));
    await userEvent.click(await screen.findByRole('button', { name: /generar prueba virtual/i }));

    await screen.findByAltText(/resultado de la prueba virtual/i, {}, { timeout: 4_000 });

    expect(captured).toBeDefined();
    expect(captured?.get('use_canonical')).toBe('true');
    expect(captured?.get('user_image')).toBeNull();
  });

  it('compara otro outfit con la misma foto de forma temporal', async () => {
    let createdJobs = 0;
    const alternativeId = '7c8f8b1a-1234-4567-8901-abcdef123456';
    server.use(
      http.post('*/api/v1/outfits/recommend', () =>
        HttpResponse.json({
          outfits: [
            recommendFixture.outfits[0],
            { ...recommendFixture.outfits[0], outfit_id: alternativeId, aesthetic: 'minimalist' },
          ],
        })
      ),
      http.post('*/api/v1/vton/try-on', () => {
        createdJobs += 1;
        return HttpResponse.json({
          job_id: `${JOB_UUID.slice(0, -1)}e`,
          status: 'processing',
          estimated_time_seconds: 1,
        });
      })
    );

    renderWithProviders(<TryOnView />);
    await uploadPhoto();
    await userEvent.click(await screen.findByRole('button', { name: /generar prueba virtual/i }));
    await screen.findByRole('button', { name: /guardar imagen/i }, { timeout: 4_000 });

    await userEvent.click(screen.getByRole('button', { name: /comparar con otro outfit/i }));
    await userEvent.selectOptions(
      await screen.findByRole('combobox', { name: /outfit alternativo/i }),
      alternativeId
    );
    await userEvent.click(screen.getByRole('button', { name: /generar comparación/i }));

    expect(
      await screen.findByRole(
        'region',
        { name: /comparacion visual de resultados/i },
        { timeout: 5_000 }
      )
    ).toBeInTheDocument();
    expect(createdJobs).toBe(2);
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

  it('pausa el polling cuando document.visibilityState no es visible y lo reanuda al volver', async () => {
    let statusCalls = 0;
    server.use(
      http.get('*/api/v1/vton/status/:id', () => {
        statusCalls += 1;
        return HttpResponse.json({
          job_id: JOB_UUID,
          status: 'processing',
        });
      })
    );

    renderWithProviders(<TryOnView />);
    await uploadPhoto();
    await userEvent.click(await screen.findByRole('button', { name: /generar prueba virtual/i }));

    expect(await screen.findByText(/generando tu prueba/i)).toBeInTheDocument();

    // Pestaña pasa a segundo plano
    await act(async () => {
      setVisibilityState('hidden');
    });

    // Corta cualquier request en vuelo de antes del hide para que el conteo
    // quede estable desde ya.
    await act(async () => {
      await new Promise(r => setTimeout(r, 50));
    });
    const callsWhileHidden = statusCalls;

    // Espera MAS de un intervalo completo de polling (el inicial es 2000ms):
    // con menos, el "no hubo llamadas" pasaria de arriba aunque el hook no
    // pausara nada (E0-T5: asercion que prueba el comportamiento real).
    await act(async () => {
      await new Promise(r => setTimeout(r, 2_400));
    });

    // No se ejecutan llamadas adicionales mientras está en background
    expect(statusCalls).toBe(callsWhileHidden);

    // Pestaña vuelve a primer plano
    await act(async () => {
      setVisibilityState('visible');
    });

    // Al volver, se reanuda el polling (próximo tick dentro de ~2s)
    await vi.waitFor(
      () => {
        expect(statusCalls).toBeGreaterThan(callsWhileHidden);
      },
      { timeout: 5_000 }
    );
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

  it('respeta prefers-reduced-motion y expone alt distinguibles en foto original y resultado', async () => {
    renderWithProviders(<TryOnView />);
    await uploadPhoto();

    await userEvent.click(await screen.findByRole('button', { name: /generar prueba virtual/i }));

    // Durante la fase de procesamiento, los spinners contienen la clase de adaptación a reduced motion
    const tracker = await screen.findByText(/generando tu prueba/i);
    expect(tracker).toBeInTheDocument();
    const spinningIcon = tracker.querySelector('svg');
    expect(spinningIcon).toHaveClass('motion-reduce:animate-none');

    // Al completarse, ambas imágenes tienen alt descriptivo y distinguible
    const originalImg = await screen.findByAltText(
      /foto original del usuario/i,
      {},
      { timeout: 4_000 }
    );
    const resultImg = await screen.findByAltText(
      /resultado de la prueba virtual con el outfit/i,
      {},
      { timeout: 4_000 }
    );

    expect(originalImg).toBeInTheDocument();
    expect(resultImg).toBeInTheDocument();
    expect(originalImg.getAttribute('alt')).not.toEqual(resultImg.getAttribute('alt'));
  });

  it('durante el procesamiento ofrece el botón "seguir usando la app" y navega a /wardrobe (86e301dm7)', async () => {
    server.use(
      http.get('*/api/v1/vton/status/:id', () =>
        HttpResponse.json({
          job_id: JOB_UUID,
          status: 'processing',
        })
      )
    );

    renderWithProviders(<TryOnView />);
    await uploadPhoto();
    await userEvent.click(await screen.findByRole('button', { name: /generar prueba virtual/i }));

    const continueBtn = await screen.findByRole('button', {
      name: /seguir usando la app/i,
    });
    expect(continueBtn).toBeInTheDocument();

    await userEvent.click(continueBtn);
    expect(push).toHaveBeenCalledWith('/wardrobe');
  });

  it('un job fallido con error_message null muestra copy de fallback limpio', async () => {
    server.use(
      http.get('*/api/v1/vton/status/:id', () =>
        HttpResponse.json({
          job_id: JOB_UUID,
          status: 'failed',
          error_message: null,
        })
      )
    );

    renderWithProviders(<TryOnView />);
    await uploadPhoto();
    await userEvent.click(await screen.findByRole('button', { name: /generar prueba virtual/i }));

    expect(
      await screen.findByText(
        /No pudimos generar la prueba virtual\. Intent[aá] con otra foto o prenda\./i,
        {},
        { timeout: 4_000 }
      )
    ).toBeInTheDocument();
    expect(screen.queryByText(/null/i)).not.toBeInTheDocument();
  });

  it('en timeout ofrece verificar de nuevo y resuelve a completed tras comprobación manual', async () => {
    let checkCount = 0;
    server.use(
      http.get('*/api/v1/vton/status/:id', () => {
        checkCount += 1;
        if (checkCount <= 1) {
          return HttpResponse.json({
            job_id: JOB_UUID,
            status: 'processing',
          });
        }
        return HttpResponse.json({
          job_id: JOB_UUID,
          status: 'completed',
          result_url: 'https://cdn.example.com/result-manual.jpg',
        });
      })
    );

    // Timeout ultracorto para disparar phase === 'timeout'
    process.env['NEXT_PUBLIC_VTON_POLL_TIMEOUT_MS'] = '50';

    renderWithProviders(<TryOnView />);
    await uploadPhoto();
    await userEvent.click(await screen.findByRole('button', { name: /generar prueba virtual/i }));

    const manualBtn = await screen.findByRole(
      'button',
      { name: /verificar de nuevo/i },
      { timeout: 4_000 }
    );
    expect(manualBtn).toBeInTheDocument();

    await userEvent.click(manualBtn);

    const resultado = await screen.findByAltText(
      /resultado de la prueba virtual/i,
      {},
      { timeout: 4_000 }
    );
    expect(resultado).toBeInTheDocument();
  }, 10_000);
});

// E2-T12 — fallo en la CREACIÓN del job (los fallos de polling ya están cubiertos en E0):
// cada código expone copy tipado en una región `alert` y devuelve el CTA a estado accionable.
describe('TryOnView — la creación del job falla', () => {
  it('un 400 expone el mensaje tipado en role="alert" y rehabilita el botón', async () => {
    server.use(http.post('*/api/v1/vton/try-on', () => mswError(400, 'Imagen inválida')));

    renderWithProviders(<TryOnView />);
    await uploadPhoto();
    await userEvent.click(await screen.findByRole('button', { name: /generar prueba virtual/i }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(
      'Solicitud inválida. Revisa la información e intenta de nuevo.'
    );
    // 400 siempre se traduce con el copy fijo de "solicitud inválida" (no el detail del server).
    expect(alert).not.toHaveTextContent('Imagen inválida');
    // Accionable: vuelve a estado idle, habilitado para reintentar.
    expect(screen.getByRole('button', { name: /generar prueba virtual/i })).toBeEnabled();
    expect(screen.queryByText(/generando tu prueba/i)).not.toBeInTheDocument();
  });

  it('un 422 con detalle de postura muestra el detalle del backend y el panel de recomendaciones', async () => {
    server.use(
      http.post('*/api/v1/vton/try-on', () =>
        mswError(422, 'No se detectó una pose corporal válida en la imagen')
      )
    );

    renderWithProviders(<TryOnView />);
    await uploadPhoto();
    await userEvent.click(await screen.findByRole('button', { name: /generar prueba virtual/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No se detectó una pose corporal válida en la imagen'
    );
    expect(screen.getByText('Revisa tu postura en la foto')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /probar con modelo de ejemplo/i })
    ).toBeInTheDocument();
  });

  it('un 500 expone copy de servidor, distinto del de conexión', async () => {
    server.use(http.post('*/api/v1/vton/try-on', () => mswError(500)));

    renderWithProviders(<TryOnView />);
    await uploadPhoto();
    await userEvent.click(await screen.findByRole('button', { name: /generar prueba virtual/i }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Error del servidor. Intenta nuevamente en unos instantes.');
    expect(alert).not.toHaveTextContent('Revisa tu conexión');
  });

  it('offline (fetch rechaza) expone copy de conexión en role="alert"', async () => {
    server.use(http.post('*/api/v1/vton/try-on', () => mswNetworkError()));

    renderWithProviders(<TryOnView />);
    await uploadPhoto();
    await userEvent.click(await screen.findByRole('button', { name: /generar prueba virtual/i }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(
      'No pudimos generar la prueba. Revisa tu conexión e intenta de nuevo.'
    );
    expect(screen.getByRole('button', { name: /generar prueba virtual/i })).toBeEnabled();
  });

  it('una petición abortada por el timeout del cliente cae en el mismo copy de conexión', async () => {
    // El timeout real de createVtonJob es 10s — imposible de esperar con timers reales y
    // arriesgado con timers falsos (userEvent + MSW). Reproducimos EXACTAMENTE la señal que
    // el cliente emite cuando su AbortController interno vence (DOMException AbortError),
    // que es lo que `apiRequest` traduce a NetworkError `Request timeout after 10000ms`.
    const realFetch = globalThis.fetch.bind(globalThis);
    vi.stubGlobal('fetch', ((input: RequestInfo | URL, init?: RequestInit) => {
      if (String(input).includes('/api/v1/vton/try-on')) {
        return Promise.reject(new DOMException('The operation was aborted', 'AbortError'));
      }
      return realFetch(input, init);
    }) as typeof fetch);

    renderWithProviders(<TryOnView />);
    await uploadPhoto();
    await userEvent.click(await screen.findByRole('button', { name: /generar prueba virtual/i }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(
      'No pudimos generar la prueba. Revisa tu conexión e intenta de nuevo.'
    );
    expect(screen.getByRole('button', { name: /generar prueba virtual/i })).toBeEnabled();
    expect(screen.queryByText(/generando tu prueba/i)).not.toBeInTheDocument();
  });

  it('el doble submit está protegido mientras el primer POST sigue EN VUELO', async () => {
    let postCount = 0;
    let release: () => void = () => {};
    const gate = new Promise<void>(resolve => {
      release = resolve;
    });
    server.use(
      http.post('*/api/v1/vton/try-on', async () => {
        postCount += 1;
        await gate;
        return HttpResponse.json({
          job_id: JOB_UUID,
          status: 'processing',
          estimated_time_seconds: 1,
        });
      })
    );

    renderWithProviders(<TryOnView />);
    await uploadPhoto();
    await userEvent.click(await screen.findByRole('button', { name: /generar prueba virtual/i }));

    // Mientras la creación está en vuelo el CTA queda deshabilitado con copy de progreso.
    const pendingBtn = await screen.findByRole('button', { name: /generando…/i });
    expect(pendingBtn).toBeDisabled();

    // Un segundo clic (protegido por estado Y por el guard de submit) no duplica el job.
    await userEvent.click(pendingBtn);
    expect(postCount).toBe(1);

    release();
    expect(
      await screen.findByText(/generando tu prueba/i, {}, { timeout: 4_000 })
    ).toBeInTheDocument();
    expect(postCount).toBe(1);
  });
});

// E2-T12 — polling, desmontaje y accesibilidad de los estados observables.
describe('TryOnView — polling, desmontaje y regiones accesibles', () => {
  it('failed con error_message vacío usa el copy de fallback en role="alert"', async () => {
    server.use(
      http.get('*/api/v1/vton/status/:id', () =>
        HttpResponse.json({ job_id: JOB_UUID, status: 'failed', error_message: '' })
      )
    );

    renderWithProviders(<TryOnView />);
    await uploadPhoto();
    await userEvent.click(await screen.findByRole('button', { name: /generar prueba virtual/i }));

    const alert = await screen.findByRole(
      'alert',
      { name: /no pudimos generar la prueba virtual/i },
      { timeout: 4_000 }
    );
    expect(alert).toHaveTextContent(
      'No pudimos generar la prueba virtual. Intenta con otra foto o prenda.'
    );
    expect(alert).not.toHaveTextContent(/\(\)/);
  });

  it('el estado de procesamiento expone role="status" anunciado por lectores de pantalla', async () => {
    server.use(
      http.get('*/api/v1/vton/status/:id', () =>
        HttpResponse.json({ job_id: JOB_UUID, status: 'processing' })
      )
    );

    renderWithProviders(<TryOnView />);
    await uploadPhoto();
    await userEvent.click(await screen.findByRole('button', { name: /generar prueba virtual/i }));

    const progress = await screen.findByText(/Generando la prueba virtual/);
    expect(progress).toHaveAttribute('role', 'status');
    // Mientras procesa, el CTA se deshabilita y anuncia el estado (no un botón muerto).
    expect(screen.getByRole('button', { name: /procesando en el probador/i })).toBeDisabled();
  });

  it('desmontar durante el polling detiene las consultas (sin llamadas tras unmount)', async () => {
    let statusCalls = 0;
    server.use(
      http.get('*/api/v1/vton/status/:id', () => {
        statusCalls += 1;
        return HttpResponse.json({ job_id: JOB_UUID, status: 'processing' });
      })
    );

    const { unmount } = renderWithProviders(<TryOnView />);
    await uploadPhoto();
    await userEvent.click(await screen.findByRole('button', { name: /generar prueba virtual/i }));
    expect(await screen.findByText(/generando tu prueba/i)).toBeInTheDocument();

    unmount();
    const callsAtUnmount = statusCalls;

    // Espera MAS de un intervalo de polling (el primer tick es 1000ms): si el cleanup
    // no cancelara el timer, aquí se dispararía una consulta nueva sobre un árbol muerto.
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 1_400));
    });

    expect(statusCalls).toBe(callsAtUnmount);
  });

  it('sin outfit en la query y sin recomendaciones ofrece ir a outfits', async () => {
    nav.outfitId = '';
    server.use(http.post('*/api/v1/outfits/recommend', () => HttpResponse.json({ outfits: [] })));

    renderWithProviders(<TryOnView />);

    expect(await screen.findByText('Elige un outfit primero')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /ver outfits/i })).toBeEnabled();
    expect(
      screen.queryByRole('button', { name: /generar prueba virtual/i })
    ).not.toBeInTheDocument();
  });

  it('un outfit inválido en la query degrada a "No encontramos ese outfit" con salida a outfits', async () => {
    nav.outfitId = 'no-es-un-uuid';
    server.use(http.get('*/api/v1/outfits/:id', () => mswError(404)));

    renderWithProviders(<TryOnView />);

    expect(await screen.findByText('No encontramos ese outfit')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /generar prueba virtual/i })
    ).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /ver outfits/i }));
    expect(push).toHaveBeenCalledWith('/outfits');
  });

  it('muestra la etapa (stage) en vivo mientras el job está procesando', async () => {
    server.use(
      http.get('*/api/v1/vton/status/:id', () =>
        HttpResponse.json({
          job_id: JOB_UUID,
          status: 'processing',
          stage: 'generating',
        })
      )
    );

    renderWithProviders(<TryOnView />);
    await uploadPhoto();
    await userEvent.click(await screen.findByRole('button', { name: /generar prueba virtual/i }));

    expect(
      await screen.findByText(
        /etapa actual:\s*generando prueba virtual con ia/i,
        {},
        { timeout: 4_000 }
      )
    ).toBeInTheDocument();
  });

  it('permite probar una prenda individual desde Smart Shopping mediante garment_layers', async () => {
    const SINGLE_GARMENT_ID = '3fa85f64-5717-4562-b3fc-2c963f66afa6';
    nav.outfitId = '';
    nav.garmentId = SINGLE_GARMENT_ID;
    nav.position = 'top';
    nav.image = 'https://cdn.example.com/candidate-top.png';

    let capturedBody = '';
    let outfitFetched = false;
    server.use(
      http.get('*/api/v1/outfits/:id', () => {
        outfitFetched = true;
        return HttpResponse.json(recommendFixture.outfits[0]);
      }),
      http.post('*/api/v1/vton/try-on', async ({ request }) => {
        capturedBody = await request.text();
        return HttpResponse.json({
          job_id: JOB_UUID,
          status: 'processing',
          estimated_time_seconds: 1,
        });
      })
    );

    renderWithProviders(<TryOnView />);

    expect(await screen.findByRole('heading', { name: /prenda a probar/i })).toBeInTheDocument();
    expect(screen.getByAltText(/prenda candidata/i)).toHaveAttribute(
      'src',
      'https://cdn.example.com/candidate-top.png'
    );
    expect(outfitFetched).toBe(false);

    await uploadPhoto();
    await userEvent.click(await screen.findByRole('button', { name: /generar prueba virtual/i }));

    expect(
      await screen.findByAltText(/resultado de la prueba virtual/i, {}, { timeout: 4_000 })
    ).toBeInTheDocument();
    expect(capturedBody).toContain(
      JSON.stringify([{ garment_id: SINGLE_GARMENT_ID, position: 'top' }])
    );
  });

  it('precarga la foto por defecto del perfil y permite cambiar por una foto puntual de un solo uso', async () => {
    let sawUserImageField = true;
    server.use(
      http.get('*/api/v1/me', () =>
        HttpResponse.json({
          user_id: 'aaaaaaaa-4567-4891-8901-abcdef123456',
          email: 'demo@styleme.test',
          has_default_vton_photo: true,
          default_vton_photo_url: 'https://cdn.example.com/mi-foto-base.jpg',
        })
      ),
      http.post('*/api/v1/vton/try-on', async ({ request }) => {
        const fd = await request.formData();
        sawUserImageField = fd.has('user_image');
        return HttpResponse.json({
          job_id: JOB_UUID,
          status: 'processing',
          estimated_time_seconds: 1,
        });
      })
    );

    renderWithProviders(<TryOnView />);

    expect(
      await screen.findByText(/foto guardada de tu perfil \(por defecto\)/i)
    ).toBeInTheDocument();
    const generateBtn = screen.getByRole('button', { name: /generar prueba virtual/i });
    expect(generateBtn).toBeEnabled();

    // Cambiar a subida puntual de un solo uso y poder volver
    await userEvent.click(
      screen.getByRole('button', { name: /usar otra foto \(solo esta vez\)/i })
    );
    expect(screen.getByText(/sube tu foto de cuerpo completo/i)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /volver a mi foto por defecto/i }));

    await userEvent.click(generateBtn);
    expect(
      await screen.findByAltText(/resultado de la prueba virtual/i, {}, { timeout: 4_000 })
    ).toBeInTheDocument();
    expect(sawUserImageField).toBe(false);
  });
});
