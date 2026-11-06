'use client';

import type { JSX, ReactNode } from 'react';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ShieldCheck } from 'lucide-react';
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
  const { consentGiven, grant } = usePhotoConsentStore();

  if (consentGiven) {
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
            <span className="text-xs font-mono font-semibold uppercase tracking-wider">
              Privacidad y Protección Biométrica
            </span>
          </div>
          <h2 className="text-lg font-bold tracking-tight text-foreground">
            Consentimiento informado para prueba virtual (VTON)
          </h2>
        </CardHeader>
        <CardContent className="p-0 space-y-2.5 text-xs sm:text-sm text-muted-foreground leading-relaxed">
          <p>
            Tu fotografía de cuerpo entero se procesa de forma temporal y segura únicamente para
            estimar la postura corporal mediante MediaPipe y proyectar las prendas del outfit
            elegido.
          </p>
          <div className="rounded-2xl border border-border/80 bg-muted/40 p-3.5 space-y-1.5 text-xs">
            <p className="font-semibold text-foreground">Política de retención (24 horas):</p>
            <ul className="list-disc pl-4 space-y-1 text-muted-foreground">
              <li>
                La foto se almacena temporalmente en Azure Blob Storage y se elimina automáticamente
                tras <strong>24 horas</strong>.
              </li>
              <li>
                <strong>Cero reentrenamiento:</strong> Tus fotografías personales nunca se utilizan
                para entrenar modelos de IA sin autorización expresa.
              </li>
              <li>
                Puedes eliminar manualmente tus resultados en cualquier momento desde tu historial
                de pruebas.
              </li>
            </ul>
          </div>
        </CardContent>
        <CardFooter className="p-0 pt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <p className="text-[11px] text-muted-foreground">
            Al continuar, autorizas el procesamiento efímero de tu imagen.
          </p>
          <Button type="button" onClick={grant} className="rounded-full shadow-xs px-6 font-medium">
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
        <Button type="button" onClick={grant}>
          Acepto y quiero continuar
        </Button>
      </CardFooter>
    </Card>
  );
}
