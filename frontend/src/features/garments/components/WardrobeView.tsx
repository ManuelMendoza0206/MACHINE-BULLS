'use client';

import { useState, type JSX } from 'react';
import { cn } from '@/lib/utils/cn';
import { BentoCard } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PhotoConsentGate } from '@/features/garments/components/PhotoConsentGate';
import { GarmentBatchUploader } from '@/features/garments/components/GarmentBatchUploader';
import { CapsuleCatalogGrid } from '@/features/garments/components/CapsuleCatalogGrid';
import { WardrobeEmptyState } from '@/features/garments/components/WardrobeEmptyState';
import { useGarmentsList } from '@/features/garments/hooks/useGarmentsList';
import { Camera, CheckCircle2, Sparkles, ArrowRight } from 'lucide-react';

type Section = 'upload' | 'capsule';

const SECTIONS: { id: Section; label: string }[] = [
  { id: 'upload', label: 'Subir prendas' },
  { id: 'capsule', label: 'Catálogo cápsula' },
];

/**
 * `/wardrobe` composition root.
 * Balanced Bento UI with 2-column layout for upload guidance and full catalog grid.
 */
export function WardrobeView(): JSX.Element {
  const [section, setSection] = useState<Section>('upload');
  const garmentsList = useGarmentsList();

  if (garmentsList.isSuccess && garmentsList.data.garments.length === 0) {
    return <WardrobeEmptyState />;
  }

  return (
    <div className="space-y-6">
      {/* Barra de Navegación de Sección Bento */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-2 rounded-2xl border border-border/80 bg-background/80 backdrop-blur-sm shadow-2xs">
        <div className="flex gap-2" role="group" aria-label="Sección del armario">
          {SECTIONS.map(s => (
            <button
              key={s.id}
              type="button"
              onClick={() => setSection(s.id)}
              aria-pressed={section === s.id}
              className={cn(
                'min-h-11 rounded-full border border-border px-5 text-sm font-medium transition-all active:scale-[0.98]',
                section === s.id
                  ? 'bg-accent text-accent-foreground shadow-xs font-semibold'
                  : 'bg-background text-foreground hover:bg-muted'
              )}
            >
              {s.label}
            </button>
          ))}
        </div>

        <div className="hidden sm:flex items-center gap-2 pr-3 text-xs text-muted-foreground font-mono">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          <span>{section === 'upload' ? 'Modo subida activa' : 'Catálogo cápsula activo'}</span>
        </div>
      </div>

      {/* Contenido Modular según Sección */}
      {section === 'upload' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* Columna Izquierda: Uploader y Cola de análisis (mismo alto alineado con la guía derecha) */}
          <div className="lg:col-span-8 h-full flex flex-col">
            <PhotoConsentGate>
              <GarmentBatchUploader />
            </PhotoConsentGate>
          </div>

          {/* Columna Derecha: Guía de Captura y Acceso Rápido Bento */}
          <div className="lg:col-span-4 h-full flex flex-col justify-between gap-6">
            <BentoCard className="p-6 rounded-3xl border-border/80 bg-background/85 shadow-sm space-y-4">
              <div className="flex items-center gap-2 text-foreground font-semibold">
                <Camera className="h-4 w-4 text-accent" />
                <h2 className="text-sm font-bold tracking-tight">Consejos para mejores fotos</h2>
              </div>
              <ul className="space-y-3 text-xs text-muted-foreground leading-relaxed">
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <span>
                    <strong className="text-foreground">Fondo liso:</strong> Coloca la prenda sobre
                    una mesa o superficie con color uniforme para facilitar el recorte.
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <span>
                    <strong className="text-foreground">Prenda estirada:</strong> Despliega mangas,
                    cuello y dobladillos para capturar su silueta completa.
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <span>
                    <strong className="text-foreground">Buena luz:</strong> Luz natural diurna o
                    lámpara frontal para una detección cromática precisa.
                  </span>
                </li>
              </ul>
            </BentoCard>

            <BentoCard className="p-6 rounded-3xl border-border/80 bg-background/85 shadow-sm justify-between space-y-4">
              <div>
                <div className="flex items-center gap-2 text-foreground font-semibold mb-2">
                  <Sparkles className="h-4 w-4 text-accent" />
                  <h2 className="text-sm font-bold tracking-tight">¿No tienes fotos a mano?</h2>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Puedes explorar y adoptar prendas de nuestro catálogo cápsula básico para empezar
                  a probar al instante.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full text-xs rounded-full h-9"
                onClick={() => setSection('capsule')}
              >
                Explorar colección cápsula
                <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
              </Button>
            </BentoCard>
          </div>
        </div>
      ) : (
        <CapsuleCatalogGrid />
      )}
    </div>
  );
}
