'use client';

import { useState, type JSX } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { GarmentCard } from '@/features/garments/components/GarmentCard';
import { useGarmentsList } from '@/features/garments/hooks/useGarmentsList';
import { updateGarmentStatus } from '@/features/garments/api/updateGarmentStatus';
import { deleteGarment } from '@/features/garments/api/deleteGarment';
import { describeGarmentError } from '@/features/garments/lib/describeGarmentError';
import { cn } from '@/lib/utils/cn';
import { Shirt, Trash2 } from 'lucide-react';

const POSITION_FILTERS: { id: string; label: string }[] = [
  { id: 'all', label: 'Todas' },
  { id: 'top', label: 'Superiores' },
  { id: 'bottom', label: 'Inferiores' },
  { id: 'dress', label: 'Vestidos' },
  { id: 'outerwear', label: 'Abrigos' },
  { id: 'footwear', label: 'Calzado' },
  { id: 'bag', label: 'Bolsos' },
];

const STATUS_LABEL: Record<string, string> = {
  AVAILABLE: 'Disponible',
  LAUNDRY: 'En lavado',
  REPAIR: 'Reparación',
  INACTIVE: 'Archivada',
};

export function MyWardrobeGrid({ onGoUpload }: { onGoUpload?: () => void }): JSX.Element {
  const queryClient = useQueryClient();
  const query = useGarmentsList();
  const [filterPosition, setFilterPosition] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const handleToggleLaundry = async (garmentId: string, currentStatus?: string) => {
    setBusyId(garmentId);
    setActionError(null);
    const nextStatus = currentStatus === 'LAUNDRY' ? 'AVAILABLE' : 'LAUNDRY';
    try {
      await updateGarmentStatus(garmentId, nextStatus);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['garments-list'] }),
        queryClient.invalidateQueries({ queryKey: ['wardrobe', 'analytics'] }),
      ]);
    } catch (err) {
      setActionError(describeGarmentError(err));
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (garmentId: string, category: string) => {
    if (typeof window !== 'undefined' && !window.confirm(`¿Quitar "${category}" de tu armario?`)) {
      return;
    }
    setBusyId(garmentId);
    setActionError(null);
    try {
      await deleteGarment(garmentId);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['garments-list'] }),
        queryClient.invalidateQueries({ queryKey: ['wardrobe', 'analytics'] }),
      ]);
    } catch (err) {
      setActionError(describeGarmentError(err));
    } finally {
      setBusyId(null);
    }
  };

  if (query.isPending) {
    return (
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="overflow-hidden rounded-2xl">
            <Skeleton className="aspect-square w-full" />
            <CardContent className="p-3 space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (query.isError) {
    return (
      <Card>
        <CardContent className="space-y-2 p-6 text-sm">
          <Badge variant="warning">Armario no disponible</Badge>
          <p className="text-muted-foreground">{describeGarmentError(query.error)}</p>
        </CardContent>
      </Card>
    );
  }

  const garments = query.data?.garments ?? [];
  if (garments.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center p-8 text-center space-y-3">
          <Shirt className="h-10 w-10 text-muted-foreground/40" />
          <p className="text-sm font-medium text-foreground">
            Todavía no tienes prendas en tu armario personal.
          </p>
          {onGoUpload && (
            <Button type="button" size="sm" onClick={onGoUpload} className="rounded-full">
              Subir tu primera prenda
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  const filtered = garments.filter(g => {
    const posMatch = filterPosition === 'all' || g.position === filterPosition;
    const statusVal = g.status ?? 'AVAILABLE';
    const statusMatch = filterStatus === 'all' || statusVal === filterStatus;
    return posMatch && statusMatch;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/80 bg-background/80 backdrop-blur-sm p-3.5 shadow-xs">
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <span className="mr-1 text-muted-foreground font-medium">Tipo:</span>
          {POSITION_FILTERS.map(f => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilterPosition(f.id)}
              className={cn(
                'rounded-full px-3 py-1 font-medium transition-all',
                filterPosition === f.id
                  ? 'bg-accent text-accent-foreground shadow-xs'
                  : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              {f.id === 'all' ? `${f.label} (${garments.length})` : f.label}
            </button>
          ))}
        </div>

        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>Estado:</span>
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            aria-label="Filtrar por estado de prenda"
            className="rounded-full border border-border bg-background px-3 py-1 text-xs text-foreground"
          >
            <option value="all">Todos</option>
            <option value="AVAILABLE">Disponible</option>
            <option value="LAUNDRY">En lavado</option>
            <option value="REPAIR">Reparación</option>
            <option value="INACTIVE">Archivada</option>
          </select>
        </label>
      </div>

      {actionError && (
        <div
          role="alert"
          className="rounded-2xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive"
        >
          {actionError}
        </div>
      )}

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center text-sm text-muted-foreground">
            Ninguna prenda coincide con los filtros actuales.
          </CardContent>
        </Card>
      ) : (
        <div className="stagger grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {filtered.map(g => {
            const currentStatus = g.status ?? 'AVAILABLE';
            const isBusy = busyId === g.id;
            const titleLabel = g.subcategory ? `${g.category} · ${g.subcategory}` : g.category;

            return (
              <GarmentCard
                key={g.id}
                imageUrl={g.processed_image_url}
                category={titleLabel}
                dominantAesthetic={g.dominant_aesthetic}
                footer={
                  <div className="flex flex-col gap-2 w-full">
                    {g.pattern && (
                      <span className="text-[10px] text-muted-foreground capitalize">
                        Estampado: {g.pattern}
                      </span>
                    )}
                    <div className="flex items-center justify-between text-[11px] pt-1 border-t border-border/40 gap-2">
                      <span
                        className={
                          currentStatus === 'LAUNDRY'
                            ? 'text-amber-500 font-medium'
                            : 'text-emerald-600 dark:text-emerald-400 font-medium'
                        }
                      >
                        {STATUS_LABEL[currentStatus] ?? currentStatus}
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => void handleToggleLaundry(g.id, currentStatus)}
                          className="text-muted-foreground hover:text-foreground underline cursor-pointer disabled:opacity-50"
                        >
                          {currentStatus === 'LAUNDRY' ? 'Limpia' : 'Lavar'}
                        </button>
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => void handleDelete(g.id, g.category)}
                          aria-label={`Eliminar ${g.category}`}
                          title="Eliminar de mi armario"
                          className="text-muted-foreground hover:text-destructive p-1 rounded-full transition-colors disabled:opacity-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>
                      </div>
                    </div>
                  </div>
                }
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
