import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PhotoConsentGate } from '@/features/garments/components/PhotoConsentGate';
import { usePhotoConsentStore } from '@/stores/photoConsentStore';

describe('PhotoConsentGate', () => {
  beforeEach(() => {
    usePhotoConsentStore.setState({ consentGiven: false });
  });

  it('blocks children until consent is given', () => {
    render(
      <PhotoConsentGate>
        <p>Contenido protegido</p>
      </PhotoConsentGate>
    );
    expect(screen.queryByText('Contenido protegido')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /acepto/i })).toBeInTheDocument();
  });

  it('reveals children after accepting, and persists the decision', async () => {
    const user = userEvent.setup();
    render(
      <PhotoConsentGate>
        <p>Contenido protegido</p>
      </PhotoConsentGate>
    );

    await user.click(screen.getByRole('button', { name: /acepto/i }));

    expect(screen.getByText('Contenido protegido')).toBeInTheDocument();
    expect(usePhotoConsentStore.getState().consentGiven).toBe(true);
  });

  it('skips the gate entirely if consent was already given', () => {
    usePhotoConsentStore.setState({ consentGiven: true });
    render(
      <PhotoConsentGate>
        <p>Contenido protegido</p>
      </PhotoConsentGate>
    );
    expect(screen.getByText('Contenido protegido')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /acepto/i })).not.toBeInTheDocument();
  });
});
