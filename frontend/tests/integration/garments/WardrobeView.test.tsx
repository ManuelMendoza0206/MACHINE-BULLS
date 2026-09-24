import { describe, it, expect, beforeEach, afterEach } from 'vitest';
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
    expect(screen.queryByText(/arrastrá tus prendas/i)).not.toBeInTheDocument();
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
    expect(screen.getByText(/arrastrá tus prendas/i)).toBeInTheDocument();
  });
});
