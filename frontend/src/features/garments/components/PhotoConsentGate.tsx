'use client';

import type { JSX, ReactNode } from 'react';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { usePhotoConsentStore } from '@/stores/photoConsentStore';

export interface PhotoConsentGateProps {
  children: ReactNode;
}

/**
 * Blocks garment uploads until the user accepts the photo consent/retention notice.
 *
 * **Placeholder copy** — see `stores/photoConsentStore.ts` for why. Update this text the
 * moment Jaicel's real Q5 spec/ADR-008 lands.
 */
export function PhotoConsentGate({ children }: PhotoConsentGateProps): JSX.Element {
  const { consentGiven, grant } = usePhotoConsentStore();

  if (consentGiven) {
    return <>{children}</>;
  }

  return (
    <Card role="region" aria-label="Consentimiento de fotos">
      <CardHeader>
        <h2 className="text-lg font-semibold">Antes de subir tus prendas</h2>
      </CardHeader>
      <CardContent className="space-y-2 text-sm text-muted-foreground">
        <p>Usamos tus fotos únicamente para analizar y mostrar tus prendas en tu guardarropa.</p>
        <p>Cada foto se conserva solo mientras la prenda esté activa en tu guardarropa.</p>
        <p>Puedes eliminar una prenda (y su foto) en cualquier momento.</p>
      </CardContent>
      <CardFooter>
        <Button type="button" onClick={grant}>
          Acepto y quiero continuar
        </Button>
      </CardFooter>
    </Card>
  );
}
