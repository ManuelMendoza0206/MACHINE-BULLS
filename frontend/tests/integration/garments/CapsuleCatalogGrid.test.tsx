import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { server } from '../../fixtures/msw/server';
import { renderWithProviders } from '../../utils/renderWithProviders';
import { CapsuleCatalogGrid } from '@/features/garments/components/CapsuleCatalogGrid';

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

describe('CapsuleCatalogGrid', () => {
  it('lists the catalog garments once loaded', async () => {
    renderWithProviders(<CapsuleCatalogGrid />);
    expect(await screen.findByText('shirt')).toBeInTheDocument();
    expect(screen.getByText('pants')).toBeInTheDocument();
    expect(screen.getByText('sneakers')).toBeInTheDocument();
  });

  it('selecting garments updates the floating counter', async () => {
    renderWithProviders(<CapsuleCatalogGrid />);
    await screen.findByText('shirt');

    const cards = screen.getAllByRole('button', { pressed: false });
    await userEvent.click(cards[0] as HTMLElement);
    expect(screen.getByText('1 prenda seleccionada')).toBeInTheDocument();

    await userEvent.click(cards[1] as HTMLElement);
    expect(screen.getByText('2 prendas seleccionadas')).toBeInTheDocument();
  });

  it('adopting selected garments marks them Adoptada and clears the selection', async () => {
    renderWithProviders(<CapsuleCatalogGrid />);
    await screen.findByText('shirt');

    await userEvent.click(screen.getAllByRole('button', { pressed: false })[0] as HTMLElement);
    await userEvent.click(screen.getByRole('button', { name: /agregar a mi armario/i }));

    expect(await screen.findByText('Adoptada')).toBeInTheDocument();
    expect(screen.queryByText(/prenda seleccionada/)).not.toBeInTheDocument();
  });

  it('adopting a garment that is already owned (409) is treated as success', async () => {
    server.use(
      http.post('*/api/v1/garments/capsule/:id/adopt', () =>
        HttpResponse.json({ detail: 'already adopted' }, { status: 409 })
      )
    );
    renderWithProviders(<CapsuleCatalogGrid />);
    await screen.findByText('shirt');

    await userEvent.click(screen.getAllByRole('button', { pressed: false })[0] as HTMLElement);
    await userEvent.click(screen.getByRole('button', { name: /agregar a mi armario/i }));

    expect(await screen.findByText('Adoptada')).toBeInTheDocument();
  });

  it('shows an explicit, documented error state when the catalog endpoint is unavailable', async () => {
    server.use(http.get('*/api/v1/garments/capsule', () => HttpResponse.json({}, { status: 500 })));
    renderWithProviders(<CapsuleCatalogGrid />);

    expect(await screen.findByText(/catálogo cápsula no disponible/i)).toBeInTheDocument();
    expect(screen.getByText(/gap G1\/G4/i)).toBeInTheDocument();
  });

  it('shows a loading state before the catalog resolves', async () => {
    renderWithProviders(<CapsuleCatalogGrid />);
    expect(screen.getAllByRole('status').length).toBeGreaterThan(0);
    await waitFor(() => expect(screen.queryAllByRole('status')).toHaveLength(0));
  });
});
