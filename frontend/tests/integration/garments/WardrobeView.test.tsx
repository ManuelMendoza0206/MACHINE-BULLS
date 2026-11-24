import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../utils/renderWithProviders';
import { WardrobeView } from '@/features/garments/components/WardrobeView';
import { usePhotoConsentStore } from '@/stores/photoConsentStore';

const originalEnv = process.env['NEXT_PUBLIC_API_BASE_URL'];

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

describe('WardrobeView', () => {
  it('starts on the upload section, gated by photo consent', () => {
    renderWithProviders(<WardrobeView />);
    expect(screen.getByRole('button', { name: /acepto/i })).toBeInTheDocument();
    expect(screen.queryByText(/arrastr[aá] tus prendas/i)).not.toBeInTheDocument();
  });

  it('switching to the capsule catalog bypasses the photo consent gate', async () => {
    renderWithProviders(<WardrobeView />);
    await userEvent.click(screen.getByRole('button', { name: /catálogo cápsula/i }));

    expect(await screen.findByText('shirt')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /acepto/i })).not.toBeInTheDocument();
  });

  it('the dropzone appears once consent is granted', async () => {
    renderWithProviders(<WardrobeView />);
    await userEvent.click(screen.getByRole('button', { name: /acepto/i }));
    expect(screen.getByText(/arrastr[aá] tus prendas/i)).toBeInTheDocument();
  });

  it('switching to Mi armario shows owned garments and supports deleting one', async () => {
    renderWithProviders(<WardrobeView />);
    await userEvent.click(screen.getByRole('button', { name: /mi armario/i }));

    expect(await screen.findByText('shirt')).toBeInTheDocument();
    expect(screen.getByText('pants')).toBeInTheDocument();

    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    await userEvent.click(screen.getByRole('button', { name: /eliminar shirt/i }));
    expect(confirmSpy).toHaveBeenCalled();
    confirmSpy.mockRestore();
  });
});
