import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../utils/renderWithProviders';
import { server } from '../../fixtures/msw/server';
import { mswError, mswJson, mswNetworkError } from '../../utils/http';
import recommendFixture from '../../fixtures/api/outfitRecommendationResponse.json';
import capsuleFixture from '../../fixtures/api/capsuleCatalogResponse.json';
import { OutfitsView } from '@/features/outfits/components/OutfitsView';
import type { Outfit } from '@/schemas/api/outfits';

const ME_UUID = 'aaaaaaaa-4567-4891-8901-abcdef123456';

const { push } = vi.hoisted(() => ({ push: vi.fn() }));
let mockSearchParams = new URLSearchParams();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
  useSearchParams: () => mockSearchParams,
}));

const originalEnv = process.env['NEXT_PUBLIC_API_BASE_URL'];

beforeEach(() => {
  process.env['NEXT_PUBLIC_API_BASE_URL'] = 'https://api.example.com';
  push.mockClear();
  mockSearchParams = new URLSearchParams();
  window.localStorage.clear();
  server.use(
    http.get('*/api/v1/me', () =>
      HttpResponse.json({ user_id: ME_UUID, email: 'demo@styleme.test' })
    ),
    http.post('*/api/v1/outfits/recommend', () => HttpResponse.json(recommendFixture)),
    http.post('*/api/v1/outfits/:id/feedback', () =>
      HttpResponse.json({
        id: 'fb-test-id',
        user_id: ME_UUID,
        outfit_id: 'test-outfit',
        rating: 1,
        created_at: new Date().toISOString(),
      })
    ),
    http.get('*/api/v1/garments/capsule', () => HttpResponse.json(capsuleFixture))
  );
});

afterEach(() => {
  window.localStorage.clear();
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

  it('permite descartar un outfit, lo retira de la superficie y persiste en localStorage (PRODUCT.md)', async () => {
    renderWithProviders(<OutfitsView />);

    const dismissBtn = await screen.findByRole('button', { name: /descartar outfit/i });
    expect(dismissBtn).toBeInTheDocument();

    await userEvent.click(dismissBtn);

    // Al descartar el único outfit del fixture, muestra el estado de todas descartadas
    expect(await screen.findByText('Descartaste todas las combinaciones')).toBeInTheDocument();

    // Verifica persistencia en localStorage
    const stored = window.localStorage.getItem(`styleme:dismissed-outfits:${ME_UUID}`);
    expect(stored).toContain('8c7f8b1a-1234-4567-8901-abcdef123456');

    // Botón para restablecer combinaciones
    const resetBtn = screen.getByRole('button', { name: /restablecer combinaciones/i });
    await userEvent.click(resetBtn);

    // Vuelve a mostrar el outfit
    expect(await screen.findByRole('button', { name: /probar puesto/i })).toBeInTheDocument();
  });

  it('permite calificar outfits con like/dislike y persiste la preferencia (86e31bceh)', async () => {
    renderWithProviders(<OutfitsView />);

    const likeBtn = await screen.findByRole('button', { name: /^me gusta la combinación/i });
    expect(likeBtn).toBeInTheDocument();

    await userEvent.click(likeBtn);

    const stored = window.localStorage.getItem(`styleme:outfit-feedback:${ME_UUID}`);
    expect(stored).toContain('"8c7f8b1a-1234-4567-8901-abcdef123456":"like"');
  });

  it('prioriza el query param ?aesthetic sobre la preferencia del perfil y permite removerlo', async () => {
    mockSearchParams = new URLSearchParams('aesthetic=formal');
    let capturedBody: Record<string, unknown> | null = null;

    server.use(
      http.get('*/api/v1/me', () =>
        HttpResponse.json({
          user_id: ME_UUID,
          email: 'demo@styleme.test',
          preferred_aesthetic: 'casual',
        })
      ),
      http.post('*/api/v1/outfits/recommend', async ({ request }) => {
        capturedBody = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json(recommendFixture);
      })
    );

    renderWithProviders(<OutfitsView />);

    // Muestra el badge del filtro activo
    expect(await screen.findByText(/filtro:\s*formal/i)).toBeInTheDocument();

    // Comprueba que se envió al backend la estética del query param, ignorando la de 'me' ('casual')
    expect(capturedBody).toMatchObject({
      target_aesthetic: 'formal',
      user_id: ME_UUID,
    });

    // Permite quitar el filtro navegando a /outfits
    const clearBtn = screen.getByRole('button', { name: /quitar filtro de estética/i });
    await userEvent.click(clearBtn);
    expect(push).toHaveBeenCalledWith('/outfits');
  });
});

// E2-T11 — caída de identidad, del recomendador y respuestas que violan el schema.
describe('OutfitsView — fallos de red y de contrato', () => {
  it('un /me 404 deja la cuenta inaccesible con Reintentar y NUNCA pide recomendaciones', async () => {
    let recommendCalls = 0;
    server.use(
      http.get('*/api/v1/me', () => mswError(404)),
      http.post('*/api/v1/outfits/recommend', () => {
        recommendCalls += 1;
        return HttpResponse.json(recommendFixture);
      })
    );

    renderWithProviders(<OutfitsView />);

    expect(await screen.findByText(/No pudimos conectar con tu cuenta/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reintentar/i })).toBeInTheDocument();
    // Sin identidad no hay user_id: el recomendador queda deshabilitado (0 llamadas).
    expect(recommendCalls).toBe(0);
    expect(screen.queryByRole('button', { name: /probar puesto/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/armario está vacío/i)).not.toBeInTheDocument();
  });

  it('un /me 500 muestra el mismo estado de cuenta, distinto de un fallo del recomendador', async () => {
    server.use(http.get('*/api/v1/me', () => mswError(500)));

    renderWithProviders(<OutfitsView />);

    expect(await screen.findByText(/No pudimos conectar con tu cuenta/i)).toBeInTheDocument();
    // La vista de identidad caída NO muestra el copy de armario/outsfits (estados distinguibles).
    expect(screen.queryByText(/No hay outfits para armar/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Error del servidor/i)).not.toBeInTheDocument();
  });

  it('un 500 del recomendador expone copy de servidor con CTA accionable', async () => {
    server.use(http.post('*/api/v1/outfits/recommend', () => mswError(500)));

    renderWithProviders(<OutfitsView />);

    expect(await screen.findByText('No hay outfits para armar')).toBeInTheDocument();
    expect(screen.getByText(/Error del servidor/)).toBeInTheDocument();
    const cta = screen.getByRole('button', { name: /completar el armario/i });
    expect(cta).toBeEnabled();
  });

  it('un 422 con detalle devuelve el detalle del backend, no el genérico', async () => {
    server.use(
      http.post('*/api/v1/outfits/recommend', () =>
        mswError(422, 'No hay prendas compatibles entre sí')
      )
    );

    renderWithProviders(<OutfitsView />);

    expect(await screen.findByText('No hay prendas compatibles entre sí')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /completar el armario/i })).toBeInTheDocument();
  });

  it('un 422 sin detalle cae al mensaje genérico accionable', async () => {
    server.use(http.post('*/api/v1/outfits/recommend', () => mswJson({}, 422)));

    renderWithProviders(<OutfitsView />);

    expect(
      await screen.findByText(/La solicitud no pudo ser procesada\. Revisa los datos ingresados\./)
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /completar el armario/i })).toBeInTheDocument();
  });

  it('offline (fetch rechaza) muestra copy de conexión, distinto del error de servidor', async () => {
    server.use(http.post('*/api/v1/outfits/recommend', () => mswNetworkError()));

    renderWithProviders(<OutfitsView />);

    expect(
      await screen.findByText(/No pudimos cargar los outfits\. Revisa tu conexión/i)
    ).toBeInTheDocument();
    // Distinguible: nada de "Error del servidor" ni de "armario vacío".
    expect(screen.queryByText(/Error del servidor/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Tu armario está vacío/i)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /completar el armario/i })).toBeInTheDocument();
  });

  it('una respuesta 200 que viola el schema no crashea: estado de error visible y sin datos corruptos', async () => {
    const brokenOutfit = { ...recommendFixture.outfits[0], chromatic_score: 9 };
    server.use(
      http.post('*/api/v1/outfits/recommend', () => HttpResponse.json({ outfits: [brokenOutfit] }))
    );

    renderWithProviders(<OutfitsView />);

    // Ningún card renderizado: ni scores ni CTA de probar.
    expect(await screen.findByText('No hay outfits para armar')).toBeInTheDocument();
    expect(screen.queryByText('92%')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /probar puesto/i })).not.toBeInTheDocument();
    // Fallback de ValidationError (no es ApiError) → copy de conexión, nunca un stack trace.
    expect(
      screen.getByText(/No pudimos cargar los outfits\. Revisa tu conexión/i)
    ).toBeInTheDocument();
    expect(screen.queryByText(/ZodError|at Object\.|ValidationError/)).not.toBeInTheDocument();
  });

  it('el estado de carga es accesible (regiones status) y termina en contenido real', async () => {
    renderWithProviders(<OutfitsView />);

    // Skeletons exponen role="status" + aria-busy (design-system spec).
    const wrapper = screen.getByLabelText('Cargando outfits');
    expect(wrapper).toBeInTheDocument();
    expect(screen.getAllByRole('status')).toHaveLength(3);
    expect(screen.queryByRole('button', { name: /probar puesto/i })).not.toBeInTheDocument();

    // Transición a contenido accionable.
    const cta = await screen.findByRole('button', { name: /probar puesto/i });
    expect(cta).toBeEnabled();
  });
});

// E2-T11 — el mismo render no debe poder confundir "sin combinaciones" con "error" con
// "armario vacío": cada estado primario tiene copy propio y exclusivo.
describe('OutfitsView — estados vacíos y de error distinguibles', () => {
  const STATES: Array<{ label: string; setup: () => void; heading: RegExp; absent: RegExp[] }> = [
    {
      label: 'armario vacío (capsule sin prendas + 400 de negocio)',
      setup: () => {
        server.use(
          http.get('*/api/v1/garments/capsule', () => HttpResponse.json({ garments: [] })),
          http.post('*/api/v1/outfits/recommend', () =>
            mswError(400, 'el usuario no tiene prendas')
          )
        );
      },
      heading: /Tu armario está vacío/,
      absent: [/No hay outfits para armar/, /Todavía no hay combinaciones/],
    },
    {
      label: 'fallo del recomendador (500)',
      setup: () => {
        server.use(http.post('*/api/v1/outfits/recommend', () => mswError(500)));
      },
      heading: /No hay outfits para armar/,
      absent: [/Tu armario está vacío/, /Todavía no hay combinaciones/],
    },
    {
      label: '200 sin combinaciones todavía',
      setup: () => {
        server.use(
          http.post('*/api/v1/outfits/recommend', () => HttpResponse.json({ outfits: [] }))
        );
      },
      heading: /Todavía no hay combinaciones/,
      absent: [/Tu armario está vacío/, /No hay outfits para armar/],
    },
  ];

  it.each(STATES)('$label -> heading propio y exclusivo', async ({ setup, heading, absent }) => {
    setup();
    const { unmount } = renderWithProviders(<OutfitsView />);

    expect(await screen.findByText(heading)).toBeInTheDocument();
    for (const other of absent) {
      expect(screen.queryByText(other)).not.toBeInTheDocument();
    }
    unmount();
  });
});

// E2-T11 — el filtro por query param llega "sucio" desde la URL: no debe romper el render
// ni contaminar el payload del recomendador cuando está vacío.
describe('OutfitsView — query param aesthetic raro o vacío', () => {
  it('un aesthetic vacío no activa filtro ni se envía al backend', async () => {
    mockSearchParams = new URLSearchParams('aesthetic=');
    let capturedBody: Record<string, unknown> | null = null;
    server.use(
      http.post('*/api/v1/outfits/recommend', async ({ request }) => {
        capturedBody = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json(recommendFixture);
      })
    );

    renderWithProviders(<OutfitsView />);

    expect(await screen.findByRole('button', { name: /probar puesto/i })).toBeInTheDocument();
    expect(screen.queryByText(/filtro:/i)).not.toBeInTheDocument();
    expect(capturedBody).not.toBeNull();
    expect(capturedBody).not.toHaveProperty('target_aesthetic');
  });

  it('un aesthetic con símbolos y espacios se muestra como filtro y viaja intacto al backend', async () => {
    const weird = '~avant_garde & co/<>%';
    mockSearchParams = new URLSearchParams({ aesthetic: weird });
    let capturedBody: Record<string, unknown> | null = null;
    server.use(
      http.post('*/api/v1/outfits/recommend', async ({ request }) => {
        capturedBody = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json(recommendFixture);
      })
    );

    renderWithProviders(<OutfitsView />);

    expect(await screen.findByText(/filtro:\s*~avant garde & co\/<>%/i)).toBeInTheDocument();
    expect(capturedBody).toMatchObject({ target_aesthetic: weird });
    // El botón de quitar sigue accesible aunque el valor sea rarísimo.
    expect(screen.getByRole('button', { name: /quitar filtro de estética/i })).toBeEnabled();
  });
});

// E2-T11 — volumen: el grid bento debe escalar sin perder tarjetas ni acciones.
describe('OutfitsView — muchas prendas y muchas combinaciones', () => {
  const POSITIONS = ['top', 'bottom', 'footwear', 'outerwear'] as const;
  const AESTHETICS = ['old_money', 'streetwear', 'casual', 'minimalist'];

  function amplifiedFixture(count: number): { outfits: Outfit[] } {
    return {
      outfits: Array.from({ length: count }, (_, i) => {
        const id = i.toString(16).padStart(12, '0');
        return {
          outfit_id: `11111111-0000-4000-8000-${id}`,
          aesthetic: AESTHETICS[i % AESTHETICS.length] ?? 'casual',
          chromatic_score: 0.5,
          embedding_score: 0.5,
          garments: POSITIONS.map((position, j) => ({
            garment_id: `22222222-0000-4000-8000-${j.toString(16).padStart(12, '0')}`,
            position,
          })),
        };
      }),
    };
  }

  it('renderiza 12 combinaciones con sus acciones sin degradarse', async () => {
    server.use(http.post('*/api/v1/outfits/recommend', () => mswJson(amplifiedFixture(12))));

    renderWithProviders(<OutfitsView />);

    expect(await screen.findByText('12 combinaciones para ti')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /probar puesto/i })).toHaveLength(12);
    expect(screen.getAllByRole('button', { name: /descartar outfit/i })).toHaveLength(12);
    expect(screen.getAllByRole('button', { name: /^me gusta la combinación/i })).toHaveLength(12);
    expect(screen.getAllByRole('button', { name: /^no me gusta la combinación/i })).toHaveLength(
      12
    );

    // Descartar uno solo no afecta al resto (estado por id, no global).
    const [firstDismiss] = screen.getAllByRole('button', { name: /descartar outfit/i });
    await userEvent.click(firstDismiss!);
    expect(await screen.findByText('11 combinaciones para ti')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /probar puesto/i })).toHaveLength(11);
  });
});

// E2-T11 — persistencia local: storage corrupto e interacciones repetidas.
describe('OutfitsView — localStorage corrupto e interacciones idempotentes', () => {
  it('un localStorage de descartes corrupto no rompe el render ni el descarte', async () => {
    window.localStorage.setItem(`styleme:dismissed-outfits:${ME_UUID}`, '{esto no es json');

    renderWithProviders(<OutfitsView />);

    const dismissBtn = await screen.findByRole('button', { name: /descartar outfit/i });
    await userEvent.click(dismissBtn);

    expect(await screen.findByText('Descartaste todas las combinaciones')).toBeInTheDocument();
    const stored = JSON.parse(
      window.localStorage.getItem(`styleme:dismissed-outfits:${ME_UUID}`) ?? '[]'
    ) as string[];
    expect(stored).toEqual(['8c7f8b1a-1234-4567-8901-abcdef123456']);
  });

  it('un localStorage de feedback corrupto no rompe el render ni el like', async () => {
    window.localStorage.setItem(`styleme:outfit-feedback:${ME_UUID}`, '<<<roto');

    renderWithProviders(<OutfitsView />);

    const likeBtn = await screen.findByRole('button', { name: /^me gusta la combinación/i });
    await userEvent.click(likeBtn);

    expect(window.localStorage.getItem(`styleme:outfit-feedback:${ME_UUID}`)).toContain(
      '"8c7f8b1a-1234-4567-8901-abcdef123456":"like"'
    );
    expect(screen.getByRole('button', { name: /probar puesto/i })).toBeInTheDocument();
  });

  it('descartar → restablecer → volver a descartar no duplica entradas', async () => {
    renderWithProviders(<OutfitsView />);

    await userEvent.click(await screen.findByRole('button', { name: /descartar outfit/i }));
    await screen.findByText('Descartaste todas las combinaciones');

    await userEvent.click(screen.getByRole('button', { name: /restablecer combinaciones/i }));
    await screen.findByRole('button', { name: /probar puesto/i });

    await userEvent.click(screen.getByRole('button', { name: /descartar outfit/i }));
    await screen.findByText('Descartaste todas las combinaciones');

    const stored = JSON.parse(
      window.localStorage.getItem(`styleme:dismissed-outfits:${ME_UUID}`) ?? '[]'
    ) as string[];
    expect(stored).toEqual(['8c7f8b1a-1234-4567-8901-abcdef123456']);
  });

  it('un like repetido alterna establemente (no duplica ni deja estado inconsistente)', async () => {
    renderWithProviders(<OutfitsView />);

    const key = `styleme:outfit-feedback:${ME_UUID}`;
    const outfitId = '8c7f8b1a-1234-4567-8901-abcdef123456';

    await userEvent.click(await screen.findByRole('button', { name: /^me gusta la combinación/i }));
    expect(window.localStorage.getItem(key)).toContain(`"${outfitId}":"like"`);

    // Segundo clic sobre el mismo botón = toggle off: la clave desaparece del mapa persistido.
    await userEvent.click(screen.getByRole('button', { name: /^me gusta la combinación/i }));
    expect(JSON.parse(window.localStorage.getItem(key) ?? '{}')).not.toHaveProperty(outfitId);
    // Y la vista sigue renderizando el outfit (nada de crash ni de estado huérfano).
    expect(screen.getByRole('button', { name: /probar puesto/i })).toBeInTheDocument();
  });

  it('si el feedback del backend falla, la preferencia local sigue visible (optimista)', async () => {
    server.use(http.post('*/api/v1/outfits/:id/feedback', () => mswError(500)));

    renderWithProviders(<OutfitsView />);

    await userEvent.click(await screen.findByRole('button', { name: /^me gusta la combinación/i }));

    // La preferencia se escribe de forma síncrona antes del POST (estado optimista).
    expect(window.localStorage.getItem(`styleme:outfit-feedback:${ME_UUID}`)).toContain(
      '"8c7f8b1a-1234-4567-8901-abcdef123456":"like"'
    );
    // La vista no muestra errores ni desaparece: el like es optimista por diseño.
    expect(screen.getByRole('button', { name: /probar puesto/i })).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('abre el Asesor de Moda Virtual, muestra los 4 bloques y acepta nota personalizada', async () => {
    let seenNote: string | undefined;
    server.use(
      http.post('*/api/v1/outfits/:id/stylist-advice', async ({ request, params }) => {
        const body = (await request.json().catch(() => ({}))) as { user_note?: string };
        seenNote = body.user_note;
        return mswJson({
          outfit_id: String(params['id']),
          why_it_works: body.user_note
            ? `Adaptado para: ${body.user_note}`
            : 'Armonía neutra para tu día.',
          accessories: ['Reloj metálico', 'Bolso estructurado'],
          grooming_and_footwear: 'Mocasines limpios y peinado ordenado.',
          event_adaptation: 'Agrega abrigo ligero para la noche.',
          source: 'azure_openai',
          model: 'styleme-gpt-5-mini',
          cached: false,
        });
      })
    );

    renderWithProviders(<OutfitsView />);

    await userEvent.click(
      await screen.findByRole('button', { name: /consultar al estilista ia/i })
    );

    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(await screen.findByText('Armonía neutra para tu día.')).toBeInTheDocument();
    expect(screen.getByText('Azure OpenAI · styleme-gpt-5-mini')).toBeInTheDocument();
    expect(screen.getByText('Reloj metálico')).toBeInTheDocument();
    expect(screen.getByText('Mocasines limpios y peinado ordenado.')).toBeInTheDocument();
    expect(screen.getByText('Agrega abrigo ligero para la noche.')).toBeInTheDocument();

    const noteInput = screen.getByLabelText(/algún detalle extra para tu ocasión/i);
    await userEvent.type(noteInput, 'Cena al aire libre');
    await userEvent.click(screen.getByRole('button', { name: /personalizar consejo/i }));

    expect(await screen.findByText('Adaptado para: Cena al aire libre')).toBeInTheDocument();
    expect(seenNote).toBe('Cena al aire libre');
  });

  it('muestra error y permite reintentar cuando falla el endpoint de estilista IA', async () => {
    let attempt = 0;
    server.use(
      http.post('*/api/v1/outfits/:id/stylist-advice', ({ params }) => {
        attempt += 1;
        if (attempt === 1) return mswError(500);
        return mswJson({
          outfit_id: String(params['id']),
          why_it_works: 'Consejo recuperado tras reintento.',
          accessories: ['Cinturón clásico'],
          grooming_and_footwear: 'Zapatillas minimalistas.',
          event_adaptation: 'Versátil todo el día.',
          source: 'rules',
          model: null,
          cached: false,
        });
      })
    );

    renderWithProviders(<OutfitsView />);

    await userEvent.click(
      await screen.findByRole('button', { name: /consultar al estilista ia/i })
    );

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /reintentar/i }));

    expect(await screen.findByText('Consejo recuperado tras reintento.')).toBeInTheDocument();
    expect(screen.getByText('Asesor local')).toBeInTheDocument();
  });

  it('permite cambiar la ciudad del clima, la persiste en localStorage y contextualiza recomendaciones', async () => {
    renderWithProviders(<OutfitsView />);

    const citySelect = (await screen.findByLabelText(/ciudad para el clima/i)) as HTMLSelectElement;
    expect(citySelect.value).toBe('La Paz');

    await userEvent.selectOptions(citySelect, 'Santa Cruz');

    expect(await screen.findByText(/Santa Cruz:\s*28°C \(Cálido\)/i)).toBeInTheDocument();
    expect(window.localStorage.getItem('styleme:weather-city')).toBe('Santa Cruz');
  });

  it('abre el armador manual, evalúa prendas elegidas y navega al probador con el outfit creado', async () => {
    renderWithProviders(<OutfitsView />);

    const buildBtn = await screen.findByRole('button', { name: /armar manualmente/i });
    await userEvent.click(buildBtn);

    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Arma tu propio outfit')).toBeInTheDocument();

    const shirtBtn = await screen.findByRole('button', { name: /shirt/i });
    const pantsBtn = screen.getByRole('button', { name: /pants/i });
    await userEvent.click(shirtBtn);
    await userEvent.click(pantsBtn);

    await userEvent.click(screen.getByRole('button', { name: /evaluar combinación/i }));

    expect(
      await screen.findByText(/equilibrio entre estampado y piezas lisas/i)
    ).toBeInTheDocument();

    const modalTryOnButtons = screen.getAllByRole('button', { name: /probar puesto/i });
    const modalTryOn = modalTryOnButtons[modalTryOnButtons.length - 1]!;
    await userEvent.click(modalTryOn);

    expect(push).toHaveBeenCalledWith('/try-on?outfit=77777777-1234-4567-8901-abcdef123456');
  });
});
