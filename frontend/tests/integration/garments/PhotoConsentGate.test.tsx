import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PhotoConsentGate } from '@/features/garments/components/PhotoConsentGate';
import { usePhotoConsentStore } from '@/stores/photoConsentStore';

describe('PhotoConsentGate', () => {
  beforeEach(() => {
    usePhotoConsentStore.setState({ consentGiven: false });
  });

  it('blocks children until consent is given in garments mode', () => {
    render(
      <PhotoConsentGate>
        <p>Contenido protegido</p>
      </PhotoConsentGate>
    );
    expect(screen.queryByText('Contenido protegido')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /acepto/i })).toBeInTheDocument();
    expect(screen.getByText('Antes de subir tus prendas')).toBeInTheDocument();
  });

  it('renders informed consent notice with 24h retention policy for vton variant', () => {
    render(
      <PhotoConsentGate variant="vton">
        <p>Probador virtual activo</p>
      </PhotoConsentGate>
    );
    expect(screen.queryByText('Probador virtual activo')).not.toBeInTheDocument();
    expect(
      screen.getByText('Consentimiento informado para prueba virtual (VTON)')
    ).toBeInTheDocument();
    expect(screen.getAllByText(/24 horas/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/cero reentrenamiento/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /acepto/i })).toBeInTheDocument();
  });

  it('reveals children after accepting, and persists the decision', async () => {
    const user = userEvent.setup();
    render(
      <PhotoConsentGate variant="vton">
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
      <PhotoConsentGate variant="vton">
        <p>Contenido protegido</p>
      </PhotoConsentGate>
    );
    expect(screen.getByText('Contenido protegido')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /acepto/i })).not.toBeInTheDocument();
  });
});
