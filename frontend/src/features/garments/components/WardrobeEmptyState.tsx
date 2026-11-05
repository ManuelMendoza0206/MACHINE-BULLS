'use client';

import type { JSX } from 'react';
import Link from 'next/link';
import { BentoCard } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PhotoConsentGate } from '@/features/garments/components/PhotoConsentGate';
import { GarmentBatchUploader } from '@/features/garments/components/GarmentBatchUploader';
import { Sparkles, ArrowRight } from 'lucide-react';

/**
 * Dual CTA shown when `/wardrobe` has zero garments.
 * Organizado en layout Bento equilibrado para evitar huecos vacíos.
 */
export function WardrobeEmptyState(): JSX.Element {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Columna Principal: Subida de primeras prendas */}
        <div className="lg:col-span-8 space-y-6">
          <BentoCard className="p-6 sm:p-7 rounded-3xl border-border/80 bg-background/85 shadow-sm">
            <div className="space-y-2">
              <span className="text-xs font-mono font-semibold text-accent uppercase tracking-wider">
                Primeros pasos
              </span>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                Tu armario todavía está vacío
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed text-pretty">
                Sube fotos de tus prendas para recortarlas y analizarlas, o agrega prendas de
                nuestra colección cápsula.
              </p>
            </div>
          </BentoCard>

          <PhotoConsentGate>
            <GarmentBatchUploader />
          </PhotoConsentGate>
        </div>

        {/* Columna Secundaria: Opción Catálogo Cápsula */}
        <div className="lg:col-span-4 space-y-6">
          <BentoCard
            glow
            className="p-6 sm:p-7 rounded-3xl border-border/80 bg-background/85 shadow-sm justify-between space-y-6"
          >
            <div className="space-y-4">
              <div className="grid h-10 w-10 place-items-center rounded-2xl bg-accent/15 text-accent">
                <Sparkles className="h-5 w-5" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-base font-bold text-foreground">Catálogo Cápsula</h3>
                <p className="text-xs text-muted-foreground leading-relaxed text-pretty">
                  Prendas básicas ya digitalizadas y calibradas por colorimetría para probar el
                  recomendador al instante.
                </p>
              </div>
            </div>

            <Button asChild size="lg" className="w-full rounded-full">
              <Link href="/wardrobe/capsule">
                Explorar catálogo cápsula
                <ArrowRight className="h-4 w-4 ml-1.5" />
              </Link>
            </Button>
          </BentoCard>
        </div>
      </div>
    </div>
  );
}
