import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { server } from '../../fixtures/msw/server';
import { renderWithProviders } from '../../utils/renderWithProviders';
import { defaultQueryClientConfig } from '@/lib/api/queryClient';
import { PlannerView } from '@/features/planner/components/PlannerView';

const originalEnv = process.env['NEXT_PUBLIC_API_BASE_URL'];

beforeEach(() => {
  process.env['NEXT_PUBLIC_API_BASE_URL'] = 'https://api.example.com';
});

afterEach(() => {
  if (originalEnv === undefined) {
    delete process.env['NEXT_PUBLIC_API_BASE_URL'];
  } else {
    process.env['NEXT_PUBLIC_API_BASE_URL'] = originalEnv;
  }
});

describe('PlannerView', () => {
  it('renders the 7-day strip and empty state when no plans exist', async () => {
    server.use(http.get('*/api/v1/planner', () => HttpResponse.json([])));

    renderWithProviders(<PlannerView />);

    expect(await screen.findByText('Planificador de vestimenta')).toBeInTheDocument();
    expect(await screen.findByText('Próximos 7 días')).toBeInTheDocument();
    expect(screen.getAllByText('Sin conjunto programado').length).toBeGreaterThan(0);
  });

  it('reuses cached planner data across revisits without redundant refetches', async () => {
    let fetchCount = 0;
    server.use(
      http.get('*/api/v1/planner', () => {
        fetchCount += 1;
        return HttpResponse.json([]);
      })
    );

    const queryClient = new QueryClient(defaultQueryClientConfig);
    const { unmount } = render(
      <QueryClientProvider client={queryClient}>
        <PlannerView />
      </QueryClientProvider>
    );
    expect(await screen.findByText('Próximos 7 días')).toBeInTheDocument();
    expect(fetchCount).toBe(1);

    unmount();
    render(
      <QueryClientProvider client={queryClient}>
        <PlannerView />
      </QueryClientProvider>
    );

    expect(screen.getByText('Próximos 7 días')).toBeInTheDocument();
    expect(screen.queryByText('Cargando tu agenda de vestimenta...')).not.toBeInTheDocument();
    expect(fetchCount).toBe(1);
  });

  it('renders existing plans and allows confirming usage', async () => {
    const mockPlan = {
      id: 'plan-12345',
      user_id: 'aaaaaaaa-4567-4891-8901-abcdef123456',
      planned_date: new Date().toISOString().split('T')[0],
      garment_ids: ['g-top-1'],
      outfit_id: 'outfit-1',
      occasion: 'Reunión de trabajo',
      notes: 'Llevar abrigo',
      status: 'PLANNED',
      created_at: '2026-11-07T12:00:00Z',
      updated_at: '2026-11-07T12:00:00Z',
    };

    server.use(
      http.get('*/api/v1/planner', () => HttpResponse.json([mockPlan])),
      http.patch('*/api/v1/planner/:id/confirm', () =>
        HttpResponse.json({
          plan: { ...mockPlan, status: 'COMPLETED' },
          usage_logged: true,
          garments_marked_laundry: ['g-top-1'],
        })
      )
    );

    renderWithProviders(<PlannerView />);

    expect(await screen.findByText('Reunión de trabajo')).toBeInTheDocument();
    expect(screen.getByText('"Llevar abrigo"')).toBeInTheDocument();

    const confirmBtn = screen.getByRole('button', { name: /usar hoy y enviar a lavar/i });
    await userEvent.click(confirmBtn);

    expect(
      await screen.findByText('¡Uso confirmado! Las prendas se movieron a lavandería.')
    ).toBeInTheDocument();
  });

  it('permite generar una maleta de viaje y agendar sus días en el calendario', async () => {
    const createdPayloads: Array<{ occasion?: string | null; planned_date?: string }> = [];
    server.use(
      http.get('*/api/v1/planner', () => HttpResponse.json([])),
      http.post('*/api/v1/planner/packing', () =>
        HttpResponse.json({
          days: 2,
          weather: 'mild',
          packed_garments: [
            {
              id: 'd1a1a1a1-1111-4111-8111-111111111111',
              category: 'shirt',
              position: 'top',
              processed_image_url: 'https://cdn.example.com/shirt.png',
            },
          ],
          daily_plans: [
            {
              day: 1,
              garment_ids: ['d1a1a1a1-1111-4111-8111-111111111111'],
              reason: 'Día 1 de viaje templado',
            },
            {
              day: 2,
              garment_ids: ['d1a1a1a1-1111-4111-8111-111111111111'],
              reason: 'Día 2 de viaje templado',
            },
          ],
          total_items_count: 1,
          combinations_unlocked_count: 2,
          tip: 'Empaca capas ligeras combinables.',
        })
      ),
      http.post('*/api/v1/planner', async ({ request }) => {
        const body = (await request.json().catch(() => ({}))) as {
          occasion?: string | null;
          planned_date?: string;
          garment_ids?: string[];
        };
        createdPayloads.push(body);
        return HttpResponse.json({
          id: `plan-trip-${createdPayloads.length}`,
          user_id: 'aaaaaaaa-4567-4891-8901-abcdef123456',
          planned_date: body.planned_date || '2026-11-20',
          garment_ids: body.garment_ids || [],
          outfit_id: null,
          occasion: body.occasion ?? 'Viaje',
          notes: null,
          status: 'PLANNED',
          created_at: '2026-11-07T12:00:00Z',
          updated_at: '2026-11-07T12:00:00Z',
        });
      })
    );

    renderWithProviders(<PlannerView />);

    await userEvent.click(await screen.findByRole('button', { name: /armar maleta de viaje/i }));
    await userEvent.click(screen.getByRole('button', { name: /armar maleta minimalista/i }));

    const scheduleTripBtn = await screen.findByRole('button', {
      name: /agendar viaje en el calendario/i,
    });
    await userEvent.click(scheduleTripBtn);

    expect(
      await screen.findByText(/¡Viaje agendado! Se programaron 2 días de outfits/i)
    ).toBeInTheDocument();
    expect(createdPayloads).toHaveLength(2);
    expect(createdPayloads[0]?.occasion).toBe('Viaje');
  });
});
