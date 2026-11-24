'use client';

import type { JSX, ReactNode } from 'react';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ShieldCheck } from 'lucide-react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { persistPhotoConsentToSupabase } from '@/features/auth/api/auth';
import { usePhotoConsentStore } from '@/stores/photoConsentStore';

export interface PhotoConsentGateProps {
  children: ReactNode;
  /**
   * Tipo de consentimiento:
   * - 'garments': Subida estándar de fotos de prendas al armario cápsula.
   * - 'vton': Consentimiento informado biométrico para la prueba virtual sobre foto corporal (Q5).
   */
  variant?: 'garments' | 'vton';
}

/**
 * Bloquea la carga de imágenes hasta que el usuario otorga su consentimiento explícito
 * cumpliendo con la política de privacidad y retención temporal (ADR-303, constitution.md §6).
 */
export function PhotoConsentGate({
  children,
  variant = 'garments',
}: PhotoConsentGateProps): JSX.Element {
  const { user } = useAuth();
  const consentGiven = usePhotoConsentStore(s => s.consentGiven);
  const consentByUser = usePhotoConsentStore(s => s.consentByUser);
  const grant = usePhotoConsentStore(s => s.grant);
  const grantForUser = usePhotoConsentStore(s => s.grantForUser);

  const userId = user?.id ?? null;
  const isConsented = userId
    ? Boolean(user?.photoConsentGiven || consentByUser[userId])
    : consentGiven;

  const handleAccept = (): void => {
    if (userId) {
      grantForUser(userId);
      void persistPhotoConsentToSupabase(true);
    } else {
      grant();
    }
  };

  if (isConsented) {
    return <>{children}</>;
  }

  if (variant === 'vton') {
    return (
      <Card
        role="region"
        aria-label="Consentimiento informado de fotografía corporal"
        className="rounded-3xl border border-accent/30 bg-background/95 p-6 shadow-sm space-y-4"
      >
        <CardHeader className="p-0 space-y-1.5">
          <div className="flex items-center gap-2 text-accent">
            <ShieldCheck className="h-5 w-5 shrink-0" aria-hidden="true" />
            <span className="text-xs font-semibold uppercase tracking-wider">
              Privacidad de tus fotos
            </span>
          </div>
          <h2 className="text-lg font-bold tracking-tight text-foreground">
            Permiso para usar tu foto en el probador
          </h2>
        </CardHeader>
        <CardContent className="p-0 space-y-2.5 text-xs sm:text-sm text-muted-foreground leading-relaxed">
          <p>
            Tu foto se procesa de forma temporal y segura únicamente para ajustar las prendas a tu
            silueta en el probador virtual.
          </p>
          <div className="rounded-2xl border border-border/80 bg-muted/40 p-3.5 space-y-1.5 text-xs">
            <p className="font-semibold text-foreground">Seguridad y retención de tus imágenes:</p>
            <ul className="list-disc pl-4 space-y-1 text-muted-foreground">
              <li>
                Tu foto se guarda de forma temporal y se elimina automáticamente tras{' '}
                <strong>24 horas</strong>.
              </li>
              <li>
                <strong>Cero reentrenamiento:</strong> Tus fotos nunca se utilizan para entrenar
                modelos de inteligencia artificial.
              </li>
              <li>Puedes eliminar tus fotos de prueba en cualquier momento desde tu historial.</li>
            </ul>
          </div>
        </CardContent>
        <CardFooter className="p-0 pt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <p className="text-[11px] text-muted-foreground">
            Al continuar, autorizas el procesamiento efímero de tu imagen.
          </p>
          <Button
            type="button"
            onClick={handleAccept}
            className="rounded-full shadow-xs px-6 font-medium"
          >
            Acepto y quiero continuar
          </Button>
        </CardFooter>
      </Card>
    );
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
        <Button type="button" onClick={handleAccept}>
          Acepto y quiero continuar
        </Button>
      </CardFooter>
    </Card>
  );
}
