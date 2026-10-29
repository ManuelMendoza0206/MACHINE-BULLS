'use client';

import { useState, type JSX } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils/cn';
import { GarmentCard } from '@/features/garments/components/GarmentCard';
import { listCapsuleGarments } from '@/features/garments/api/listCapsuleGarments';
import { adoptCapsuleGarment } from '@/features/garments/api/adoptCapsuleGarment';
import { describeGarmentError } from '@/features/garments/lib/describeGarmentError';
import { CheckCircle2 } from 'lucide-react';

type AdoptState = 'idle' | 'adopting' | 'adopted' | 'error';

/**
 * Catálogo "Básicos StyleMe" (wardrobe-flow/spec.md — "Catálogo cápsula con cobertura mínima
 * verificable"). Selección múltiple + adopción por prenda.
 */
export function CapsuleCatalogGrid(): JSX.Element {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [adoptState, setAdoptState] = useState<Record<string, AdoptState>>({});
  const [adoptBannerError, setAdoptBannerError] = useState<string | null>(null);
  const [adoptedSuccessCount, setAdoptedSuccessCount] = useState<number | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>('all');

  const query = useQuery({
    queryKey: ['capsule-catalog'],
    queryFn: ({ signal }) => listCapsuleGarments(signal),
  });

  const toggle = (id: string): void => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const adoptSelected = async (): Promise<void> => {
    setAdoptBannerError(null);
    const ids = [...selectedIds];
    setAdoptState(prev => {
      const next = { ...prev };
      ids.forEach(id => (next[id] = 'adopting'));
      return next;
    });

    const results = await Promise.allSettled(ids.map(id => adoptCapsuleGarment(id)));

    setAdoptState(prev => {
      const next = { ...prev };
      results.forEach((result, i) => {
        const id = ids[i] as string;
        next[id] = result.status === 'fulfilled' ? 'adopted' : 'error';
      });
      return next;
    });

    const firstFailure = results.find((r): r is PromiseRejectedResult => r.status === 'rejected');
    const successCount = results.filter(r => r.status === 'fulfilled').length;
    if (successCount > 0) {
      setAdoptedSuccessCount(successCount);
    }
    if (firstFailure) {
      setAdoptBannerError(describeGarmentError(firstFailure.reason));
    } else {
      setSelectedIds(new Set());
    }
  };

  if (query.isPending) {
    return (
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4" aria-busy="true">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={`capsule-skeleton-${i}`} className="aspect-square w-full" />
        ))}
      </div>
    );
  }

  if (query.isError) {
    return (
      <Card>
        <CardContent className="space-y-2 p-6 text-sm">
          <Badge variant="warning">Catálogo cápsula no disponible</Badge>
          <p className="text-muted-foreground">{describeGarmentError(query.error)}</p>
          <p className="text-xs text-muted-foreground">
            Bloqueo conocido: el endpoint de catálogo cápsula (gap G1/G4,
            openspec/specs/frontend/api-contract-gaps/spec.md) todavía no está publicado por el
            backend.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!query.data) {
    return <></>; // exhausted: not pending, not error, but no data yet (shouldn't happen)
  }
  const garments = query.data.garments;

  if (garments.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-sm text-muted-foreground">
          El catálogo cápsula todavía no tiene prendas publicadas.
        </CardContent>
      </Card>
    );
  }

  const filteredGarments =
    filterCategory === 'all'
      ? garments
      : garments.filter(g => {
          const cat = g.category.toLowerCase();
          if (filterCategory === 'top') return cat === 'top';
          if (filterCategory === 'bottom') return cat === 'bottom';
          if (filterCategory === 'outwear') return cat === 'outwear' || cat === 'outerwear';
          return cat === filterCategory;
        });

  return (
    <div className="space-y-6">
      {/* Barra de Filtros y Selección Rápida */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/80 bg-background/80 backdrop-blur-sm p-3.5 shadow-xs">
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <span className="mr-1 text-muted-foreground font-medium">Categoría:</span>
          {[
            { id: 'all', label: `Todas (${garments.length})` },
            { id: 'top', label: 'Superiores' },
            { id: 'bottom', label: 'Inferiores' },
            { id: 'outwear', label: 'Abrigos' },
          ].map(f => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilterCategory(f.id)}
              className={cn(
                'rounded-full px-3 py-1 font-medium transition-all active:scale-[0.98]',
                filterCategory === f.id
                  ? 'bg-accent text-accent-foreground shadow-xs'
                  : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {selectedIds.size < garments.length ? (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="text-xs h-8 rounded-full"
              onClick={() => setSelectedIds(new Set(garments.map(g => g.id)))}
            >
              Seleccionar todas
            </Button>
          ) : (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="text-xs h-8 rounded-full"
              onClick={() => setSelectedIds(new Set())}
            >
              Deseleccionar
            </Button>
          )}
        </div>
      </div>

      {adoptedSuccessCount !== null && adoptedSuccessCount > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-emerald-800 dark:text-emerald-300">
          <div className="flex items-center gap-2.5 text-sm font-medium">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>
              ¡{adoptedSuccessCount}{' '}
              {adoptedSuccessCount === 1 ? 'prenda agregada' : 'prendas agregadas'} a tu armario! Ya
              podés combinarlas.
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button asChild size="sm" className="bg-emerald-700 hover:bg-emerald-800 text-white">
              <Link href="/outfits">Ver Outfits Recomendados ➔</Link>
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 text-xs text-muted-foreground hover:text-foreground"
              onClick={() => setAdoptedSuccessCount(null)}
            >
              Cerrar
            </Button>
          </div>
        </div>
      )}

      {adoptBannerError ? (
        <Card>
          <CardContent className="p-3 text-sm text-destructive">{adoptBannerError}</CardContent>
        </Card>
      ) : null}

      <div className="stagger grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {filteredGarments.map(garment => {
          const state = adoptState[garment.id] ?? 'idle';
          return (
            <GarmentCard
              key={garment.id}
              imageUrl={garment.processed_image_url}
              category={garment.category}
              dominantAesthetic={garment.dominant_aesthetic}
              selected={selectedIds.has(garment.id)}
              onToggleSelect={() => toggle(garment.id)}
              footer={
                state === 'adopted' ? (
                  <Badge variant="success">Adoptada</Badge>
                ) : state === 'error' ? (
                  <Badge variant="warning">Error al adoptar</Badge>
                ) : null
              }
            />
          );
        })}
      </div>

      {selectedIds.size > 0 ? (
        <div className="sticky bottom-4 z-10 flex items-center justify-between rounded-2xl border border-border/80 bg-background/95 p-3.5 shadow-xl backdrop-blur-md">
          <span className="text-sm font-medium">
            {selectedIds.size} prenda{selectedIds.size === 1 ? '' : 's'} seleccionada
            {selectedIds.size === 1 ? '' : 's'}
          </span>
          <Button type="button" onClick={() => void adoptSelected()}>
            Agregar a mi armario
          </Button>
        </div>
      ) : null}
    </div>
  );
}
