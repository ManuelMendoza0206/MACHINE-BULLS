'use client';

import { useMemo, useState, type JSX } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { CheckCircle2, Layers, Loader2, Sparkles, Wand2, WashingMachine, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils/cn';
import { listGarments } from '@/features/garments/api/listGarments';
import { listCapsuleGarments } from '@/features/garments/api/listCapsuleGarments';
import { evaluateManualOutfit } from '@/features/outfits/api/evaluateManualOutfit';
import type { GarmentSummary } from '@/schemas/api/garments';
import type { Outfit, OutfitPosition } from '@/schemas/api/outfits';

const POSITION_TABS: Array<{ id: 'all' | OutfitPosition; label: string }> = [
  { id: 'all', label: 'Todas' },
  { id: 'top', label: 'Superior' },
  { id: 'bottom', label: 'Inferior' },
  { id: 'dress', label: 'Vestido' },
  { id: 'outerwear', label: 'Abrigo' },
  { id: 'footwear', label: 'Calzado' },
  { id: 'bag', label: 'Bolso' },
];

const POSITION_LABELS: Record<OutfitPosition, string> = {
  top: 'Superior',
  bottom: 'Inferior',
  dress: 'Vestido',
  outerwear: 'Abrigo',
  footwear: 'Calzado',
  bag: 'Bolso',
};

export interface ManualOutfitBuilderModalProps {
  occasion?: string;
  weather?: string;
  onClose: () => void;
  onTryOn: (outfitId: string) => void;
  onAskStylist: (outfit: Outfit) => void;
}

export function ManualOutfitBuilderModal({
  occasion,
  weather,
  onClose,
  onTryOn,
  onAskStylist,
}: ManualOutfitBuilderModalProps): JSX.Element {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [positionFilter, setPositionFilter] = useState<'all' | OutfitPosition>('all');

  const garmentsQuery = useQuery({
    queryKey: ['garments-list'],
    queryFn: ({ signal }) => listGarments(signal),
    staleTime: 30_000,
  });

  const capsuleQuery = useQuery({
    queryKey: ['capsule'],
    queryFn: ({ signal }) => listCapsuleGarments(signal),
    staleTime: 60_000,
  });

  const allGarments = useMemo<GarmentSummary[]>(() => {
    const userList = garmentsQuery.data?.garments ?? [];
    if (userList.length > 0) return userList;
    return capsuleQuery.data?.garments ?? [];
  }, [garmentsQuery.data, capsuleQuery.data]);

  const garmentById = useMemo(
    () => new Map<string, GarmentSummary>(allGarments.map(g => [g.id, g])),
    [allGarments]
  );

  const filteredGarments = useMemo(() => {
    if (positionFilter === 'all') return allGarments;
    return allGarments.filter(g => (g.position ?? 'top') === positionFilter);
  }, [allGarments, positionFilter]);

  const evaluateMutation = useMutation({
    mutationFn: (ids: string[]) =>
      evaluateManualOutfit({
        garment_ids: ids,
        occasion,
        weather,
      }),
  });

  const toggleGarment = (garment: GarmentSummary): void => {
    if (garment.status === 'LAUNDRY' || garment.status === 'INACTIVE') return;
    evaluateMutation.reset();

    const pos = (garment.position ?? 'top') as OutfitPosition;
    setSelectedIds(prev => {
      if (prev.includes(garment.id)) {
        return prev.filter(id => id !== garment.id);
      }

      const filtered = prev.filter(existingId => {
        const existing = garmentById.get(existingId);
        const existingPos = (existing?.position ?? 'top') as OutfitPosition;
        if (existingPos === pos) return false;
        if (pos === 'dress' && (existingPos === 'top' || existingPos === 'bottom')) return false;
        if ((pos === 'top' || pos === 'bottom') && existingPos === 'dress') return false;
        return true;
      });

      if (filtered.length >= 6) return filtered;
      return [...filtered, garment.id];
    });
  };

  const evaluatedOutfit = evaluateMutation.data;
  const isLoadingList = garmentsQuery.isLoading && capsuleQuery.isLoading;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="manual-outfit-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
    >
      <div className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-border bg-background p-6 shadow-2xl space-y-5">
        {/* Encabezado */}
        <div className="flex items-start justify-between gap-3 border-b border-border/60 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-accent/15 text-accent shrink-0">
              <Layers className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h3 id="manual-outfit-title" className="text-base font-bold text-foreground">
                Arma tu propio outfit
              </h3>
              <p className="text-xs text-muted-foreground">
                Elige prendas de tu armario y evalúa su armonía cromática y compatibilidad en vivo.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar armador manual"
            className="rounded-full p-1.5 text-muted-foreground hover:bg-muted"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Filtros por posición */}
        <div className="flex flex-wrap gap-1.5">
          {POSITION_TABS.map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setPositionFilter(tab.id)}
              className={cn(
                'rounded-full px-3 py-1 text-xs font-medium transition-colors',
                positionFilter === tab.id
                  ? 'bg-accent text-accent-foreground font-semibold'
                  : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Selección de prendas */}
        {isLoadingList ? (
          <div className="py-10 text-center text-xs text-muted-foreground">
            Cargando prendas de tu armario...
          </div>
        ) : filteredGarments.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
            No hay prendas disponibles en esta categoría.
          </div>
        ) : (
          <div className="grid max-h-64 grid-cols-3 sm:grid-cols-4 gap-2.5 overflow-y-auto rounded-2xl border border-border/60 bg-muted/20 p-3">
            {filteredGarments.map(g => {
              const isSelected = selectedIds.includes(g.id);
              const isUnavailable = g.status === 'LAUNDRY' || g.status === 'INACTIVE';
              const posLabel = POSITION_LABELS[(g.position ?? 'top') as OutfitPosition] ?? 'Prenda';

              return (
                <button
                  key={g.id}
                  type="button"
                  disabled={isUnavailable}
                  onClick={() => toggleGarment(g)}
                  className={cn(
                    'relative flex flex-col overflow-hidden rounded-2xl border bg-background p-1.5 text-left transition-all',
                    isSelected
                      ? 'border-accent bg-accent/10 ring-2 ring-accent'
                      : isUnavailable
                        ? 'opacity-40 cursor-not-allowed border-dashed border-border'
                        : 'border-border/60 hover:border-accent/50'
                  )}
                >
                  <div className="aspect-square w-full overflow-hidden rounded-xl bg-muted/30">
                    {/* eslint-disable-next-line @next/next/no-img-element -- garment URL */}
                    <img
                      src={g.processed_image_url}
                      alt={`${g.category} (${posLabel})`}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <p className="mt-1 truncate text-[11px] font-semibold capitalize text-foreground">
                    {g.subcategory ?? g.category}
                  </p>
                  <p className="truncate text-[10px] text-muted-foreground">{posLabel}</p>
                  {isUnavailable && (
                    <span className="absolute top-2 right-2 rounded-full bg-amber-500/80 p-1 text-white">
                      <WashingMachine className="h-3 w-3" />
                    </span>
                  )}
                  {isSelected && (
                    <span className="absolute top-2 right-2 rounded-full bg-accent p-0.5 text-accent-foreground">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Resumen de selección y botón evaluar */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-xs text-muted-foreground">
            {selectedIds.length}{' '}
            {selectedIds.length === 1 ? 'prenda seleccionada' : 'prendas seleccionadas'} (máx. 6)
          </span>
          <div className="flex items-center gap-2">
            {selectedIds.length > 0 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="rounded-full text-xs"
                onClick={() => {
                  setSelectedIds([]);
                  evaluateMutation.reset();
                }}
              >
                Limpiar
              </Button>
            )}
            <Button
              type="button"
              size="sm"
              disabled={selectedIds.length === 0 || evaluateMutation.isPending}
              onClick={() => evaluateMutation.mutate(selectedIds)}
              className="rounded-full gap-1.5 text-xs"
            >
              {evaluateMutation.isPending ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Evaluando...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Evaluar combinación</span>
                </>
              )}
            </Button>
          </div>
        </div>

        {evaluateMutation.isError && (
          <div
            role="alert"
            className="rounded-2xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive"
          >
            {evaluateMutation.error instanceof Error
              ? evaluateMutation.error.message
              : 'No pudimos evaluar esta combinación. Intenta de nuevo.'}
          </div>
        )}

        {/* Resultado en vivo */}
        {evaluatedOutfit && (
          <div className="space-y-4 rounded-2xl border border-accent/30 bg-accent/5 p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold capitalize text-foreground">
                Estética: {evaluatedOutfit.aesthetic.replace(/_/g, ' ')}
              </span>
              <Badge variant="outline" className="border-accent/40 text-accent font-mono text-xs">
                {evaluatedOutfit.garments.length} piezas
              </Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                  <span>Armonía cromática</span>
                  <span className="font-semibold text-accent">
                    {Math.round(evaluatedOutfit.chromatic_score * 100)}%
                  </span>
                </div>
                <Progress
                  value={Math.round(evaluatedOutfit.chromatic_score * 100)}
                  className="h-2 rounded-full"
                />
              </div>
              <div>
                <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                  <span>Compatibilidad de estilo</span>
                  <span className="font-semibold text-accent">
                    {Math.round(evaluatedOutfit.embedding_score * 100)}%
                  </span>
                </div>
                <Progress
                  value={Math.round(evaluatedOutfit.embedding_score * 100)}
                  className="h-2 rounded-full"
                />
              </div>
            </div>

            {evaluatedOutfit.reason && (
              <p className="rounded-xl border border-accent/20 bg-background/80 p-3 text-xs text-foreground">
                <span className="font-semibold text-accent mr-1">Por qué combina:</span>
                {evaluatedOutfit.reason}
              </p>
            )}

            <div className="flex flex-wrap gap-2 pt-1">
              <Button
                type="button"
                size="sm"
                className="flex-1 rounded-full gap-1.5 text-xs"
                onClick={() => onTryOn(evaluatedOutfit.outfit_id)}
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>Probar puesto</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="flex-1 rounded-full gap-1.5 text-xs border-accent/40 text-accent hover:bg-accent/10"
                onClick={() => onAskStylist(evaluatedOutfit)}
              >
                <Wand2 className="h-3.5 w-3.5" />
                <span>Profundizar con Estilista IA</span>
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
