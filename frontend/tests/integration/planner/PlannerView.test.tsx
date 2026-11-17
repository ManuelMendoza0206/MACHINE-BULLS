import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { server } from '../../fixtures/msw/server';
import { renderWithProviders } from '../../utils/renderWithProviders';
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
    expect(screen.getByText('Próximos 7 días')).toBeInTheDocument();
    expect(screen.getAllByText('Sin conjunto programado').length).toBeGreaterThan(0);
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
});
