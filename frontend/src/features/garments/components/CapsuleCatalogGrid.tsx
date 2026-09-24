'use client';

import { useState, type JSX } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { GarmentCard } from '@/features/garments/components/GarmentCard';
import { listCapsuleGarments } from '@/features/garments/api/listCapsuleGarments';
import { adoptCapsuleGarment } from '@/features/garments/api/adoptCapsuleGarment';
import { describeGarmentError } from '@/features/garments/lib/describeGarmentError';

type AdoptState = 'idle' | 'adopting' | 'adopted' | 'error';

/**
 * Catálogo "Básicos StyleMe" (wardrobe-flow/spec.md — "Catálogo cápsula con cobertura mínima
 * verificable"). Selección múltiple + adopción por prenda.
 *
 * **GAP G1/G4** (api-contract-gaps/spec.md): `GET /garments/capsule` and
 * `POST /garments/capsule/{id}/adopt` are documented but unconfirmed — at time of writing the
 * backend exposes neither (`backend/src/api/` is an empty scaffold). Against a real deployment
 * this renders the error state below, which explicitly names the gap rather than presenting a
 * broken "select and nothing happens" UI — that *is* the "documented blocked state" the spec
 * asks for. MSW covers the success path in tests.
 */
export function CapsuleCatalogGrid(): JSX.Element {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [adoptState, setAdoptState] = useState<Record<string, AdoptState>>({});
  const [adoptBannerError, setAdoptBannerError] = useState<string | null>(null);

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

  return (
    <div className="space-y-4">
      {adoptBannerError ? (
        <Card>
          <CardContent className="p-3 text-sm text-destructive">{adoptBannerError}</CardContent>
        </Card>
      ) : null}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {garments.map(garment => {
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
        <div className="sticky bottom-4 flex items-center justify-between rounded-lg border border-border bg-background p-3 shadow-md">
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
