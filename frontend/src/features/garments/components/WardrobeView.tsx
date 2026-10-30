'use client';

import { useState, type JSX } from 'react';
import { cn } from '@/lib/utils/cn';
import { PhotoConsentGate } from '@/features/garments/components/PhotoConsentGate';
import { GarmentBatchUploader } from '@/features/garments/components/GarmentBatchUploader';
import { CapsuleCatalogGrid } from '@/features/garments/components/CapsuleCatalogGrid';
import { WardrobeEmptyState } from '@/features/garments/components/WardrobeEmptyState';
import { useGarmentsList } from '@/features/garments/hooks/useGarmentsList';

type Section = 'upload' | 'capsule';

const SECTIONS: { id: Section; label: string }[] = [
  { id: 'upload', label: 'Subir prendas' },
  { id: 'capsule', label: 'Catálogo cápsula' },
];

/**
 * `/wardrobe` composition root. No Tabs primitive exists yet (design-system Sprint 2 scope),
 * so this is a plain button-group toggle rather than a full ARIA tabs pattern.
 */
export function WardrobeView(): JSX.Element {
  const [section, setSection] = useState<Section>('upload');
  const garmentsList = useGarmentsList();

  // GAP G1: mientras el listado no confirme 0 prendas (pending, error, o length > 0) se
  // mantiene la vista actual — el estado vacío solo reemplaza la vista ante un `length === 0`
  // ya resuelto, para no ocultar la UI existente detrás de una carga/error del gap.
  if (garmentsList.isSuccess && garmentsList.data.garments.length === 0) {
    return <WardrobeEmptyState />;
  }

  return (
    <div className="space-y-6">
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
                ? 'bg-accent text-accent-foreground shadow-xs'
                : 'bg-background text-foreground hover:bg-muted'
            )}
          >
            {s.label}
          </button>
        ))}
      </div>

      {section === 'upload' ? (
        <PhotoConsentGate>
          <GarmentBatchUploader />
        </PhotoConsentGate>
      ) : (
        <CapsuleCatalogGrid />
      )}
    </div>
  );
}
