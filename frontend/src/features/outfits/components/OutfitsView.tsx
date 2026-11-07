'use client';

import { useCallback, useState, type JSX } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { cn } from '@/lib/utils/cn';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Sparkles, ArrowRight, X, RotateCcw, ThumbsUp, ThumbsDown } from 'lucide-react';
import { useMe } from '@/features/auth/hooks/useMe';
import { listCapsuleGarments } from '@/features/garments/api/listCapsuleGarments';
import { recommendOutfits } from '@/features/outfits/api/recommendOutfits';
import { mapStatusToUserMessage } from '@/lib/api/mapStatusToUserMessage';
import { ApiError } from '@/lib/errors';
import type { Outfit, OutfitPosition } from '@/schemas/api/outfits';
import type { GarmentSummary } from '@/schemas/api/garments';

const POSITION_LABEL: Record<OutfitPosition, string> = {
  top: 'Parte superior',
  bottom: 'Parte inferior',
  footwear: 'Calzado',
  outerwear: 'Abrigo',
};

/**
 * Mensaje de fallo distinguiendo causa raíz: si el backend rechazó con 400 (armario
 * incompleto / sin prendas) mostramos el detalle real del servidor en vez de un
 * "no hay combinaciones" genérico (outfits-flow: "Estado vacío distingue causa raíz").
 */
function describeFailure(error: unknown): string {
  if (error instanceof ApiError && error.status === 400) {
    const detail = (error.responseBody as { detail?: unknown } | undefined)?.detail;
    if (typeof detail === 'string' && detail.length > 0) return detail;
  }
  if (error instanceof ApiError) return mapStatusToUserMessage(error.status, error.responseBody);
  return 'No pudimos cargar los outfits. Revisa tu conexión e intenta de nuevo.';
}

function getDismissedKey(userId?: string): string {
  return userId ? `styleme:dismissed-outfits:${userId}` : 'styleme:dismissed-outfits:anon';
}

function getStoredDismissed(userId?: string): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = window.localStorage.getItem(getDismissedKey(userId));
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? (parsed as string[]) : [];
  } catch {
    return [];
  }
}

function getFeedbackKey(userId?: string): string {
  return userId ? `styleme:outfit-feedback:${userId}` : 'styleme:outfit-feedback:anon';
}

function getStoredFeedback(userId?: string): Record<string, 'like' | 'dislike'> {
  if (typeof window === 'undefined') return {};
  try {
    const stored = window.localStorage.getItem(getFeedbackKey(userId));
    if (!stored) return {};
    const parsed = JSON.parse(stored);
    return typeof parsed === 'object' && parsed !== null
      ? (parsed as Record<string, 'like' | 'dislike'>)
      : {};
  } catch {
    return {};
  }
}

interface OutfitCardProps {
  outfit: Outfit;
  images: Map<string, GarmentSummary>;
  feedback?: 'like' | 'dislike';
  onTryOn: (outfitId: string) => void;
  onDismiss: (outfitId: string) => void;
  onFeedback: (outfitId: string, type: 'like' | 'dislike') => void;
}

function OutfitCard({
  outfit,
  images,
  feedback,
  onTryOn,
  onDismiss,
  onFeedback,
}: OutfitCardProps): JSX.Element {
  const chromaPct = Math.round(outfit.chromatic_score * 100);
  const embPct = Math.round(outfit.embedding_score * 100);

  return (
    <Card className="h-full flex flex-col justify-between overflow-hidden rounded-3xl border border-border/80 bg-background/85 backdrop-blur-sm shadow-sm transition-all hover:border-accent/40 hover:shadow-md p-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-border/60">
          <h2 className="text-lg font-bold capitalize tracking-tight text-foreground">
            {outfit.aesthetic.replace(/_/g, ' ')}
          </h2>
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className="border-accent/30 text-accent font-mono text-xs px-2.5 py-0.5"
            >
              {outfit.garments.length} prendas
            </Badge>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onDismiss(outfit.outfit_id)}
              className="h-8 w-8 p-0 rounded-full text-muted-foreground hover:text-destructive transition-colors"
              aria-label={`Descartar outfit ${outfit.aesthetic.replace(/_/g, ' ')}`}
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        </div>

        <ul className="grid grid-cols-4 gap-2.5" aria-label="Prendas del outfit">
          {outfit.garments.map(ref => {
            const garment = images.get(ref.garment_id);
            const alt = garment
              ? `${garment.category}, estética ${garment.dominant_aesthetic}`
              : POSITION_LABEL[ref.position];
            return (
              <li
                key={ref.garment_id}
                className="group relative aspect-square overflow-hidden rounded-2xl bg-muted/60 border border-border/50 transition-all hover:border-accent/40"
              >
                {garment ? (
                  // eslint-disable-next-line @next/next/no-img-element -- URL arbitraria del backend (schema .url(), sin host restringido)
                  <img
                    src={garment.processed_image_url}
                    alt={alt}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                ) : (
                  <span className="flex h-full items-center justify-center p-1 text-center text-xs text-muted-foreground">
                    {POSITION_LABEL[ref.position]}
                  </span>
                )}
                <span className="absolute bottom-1 left-1 right-1 rounded-md bg-background/85 px-1 py-0.5 text-[8px] font-mono font-medium text-foreground text-center truncate backdrop-blur-xs">
                  {POSITION_LABEL[ref.position].split(' ')[1] ?? POSITION_LABEL[ref.position]}
                </span>
              </li>
            );
          })}
        </ul>

        <div className="space-y-3 pt-2">
          <div>
            <div className="mb-1.5 flex justify-between text-xs text-muted-foreground">
              <span>Armonía cromática</span>
              <span className="font-semibold text-accent">{chromaPct}%</span>
            </div>
            <Progress
              value={chromaPct}
              aria-label="Armonía cromática"
              className="h-2 rounded-full"
            />
          </div>
          <div>
            <div className="mb-1.5 flex justify-between text-xs text-muted-foreground">
              <span>Compatibilidad de estilo</span>
              <span className="font-semibold text-accent">{embPct}%</span>
            </div>
            <Progress
              value={embPct}
              aria-label="Compatibilidad de estilo"
              className="h-2 rounded-full"
            />
          </div>
        </div>
      </div>

      <div className="pt-5 mt-4 border-t border-border/60 flex items-center gap-2">
        <Button
          type="button"
          onClick={() => onTryOn(outfit.outfit_id)}
          className="flex-1 min-h-11 rounded-full shadow-xs inline-flex items-center justify-center gap-2 font-medium"
        >
          <Sparkles className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>Probar puesto en Probador</span>
          <ArrowRight className="h-4 w-4 shrink-0" aria-hidden="true" />
        </Button>
        <Button
          type="button"
          variant={feedback === 'like' ? 'default' : 'outline'}
          size="sm"
          onClick={() => onFeedback(outfit.outfit_id, 'like')}
          className={cn(
            'h-11 w-11 p-0 rounded-full shrink-0 transition-colors',
            feedback === 'like'
              ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
              : 'hover:text-emerald-600'
          )}
          aria-label={`Me gusta la combinación ${outfit.aesthetic.replace(/_/g, ' ')}`}
        >
          <ThumbsUp className="h-4 w-4" aria-hidden="true" />
        </Button>
        <Button
          type="button"
          variant={feedback === 'dislike' ? 'destructive' : 'outline'}
          size="sm"
          onClick={() => onFeedback(outfit.outfit_id, 'dislike')}
          className="h-11 w-11 p-0 rounded-full shrink-0 transition-colors"
          aria-label={`No me gusta la combinación ${outfit.aesthetic.replace(/_/g, ' ')}`}
        >
          <ThumbsDown className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>
    </Card>
  );
}

/**
 * `/outfits` composition root: pide la identidad al backend (`/me`), arma los
 * outfits con el recomendador cromático y los pinta con las fotos reales del
 * catálogo. Recomendar es un POST que persiste, así que con `staleTime: Infinity`
 * no se repite en cada montaje; "Recomendar de nuevo" lo dispara a mano.
 *
 * Cumple con PRODUCT.md: los outfits descartados abandonan la superficie y su
 * descarte sobrevive a la recarga de página (aislado por usuario).
 */
export function OutfitsView(): JSX.Element {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: me, isLoading: meLoading, error: meError } = useMe();
  const userId = me?.user_id;

  // Regla de prevalencia (86e301dru): query params de la URL tienen prioridad estricta sobre la preferencia guardada
  const queryAesthetic =
    typeof searchParams?.get === 'function'
      ? searchParams.get('aesthetic') || searchParams.get('target_aesthetic') || null
      : null;
  const targetAesthetic = queryAesthetic ?? undefined;

  const [dismissed, setDismissed] = useState<string[]>(() => getStoredDismissed(userId));
  const [feedbackMap, setFeedbackMap] = useState<Record<string, 'like' | 'dislike'>>(() =>
    getStoredFeedback(userId)
  );

  const handleFeedback = useCallback(
    (id: string, type: 'like' | 'dislike') => {
      setFeedbackMap(prev => {
        const next = { ...prev };
        if (next[id] === type) {
          delete next[id];
        } else {
          next[id] = type;
        }
        try {
          window.localStorage.setItem(getFeedbackKey(userId), JSON.stringify(next));
        } catch {
          // ignore storage error
        }
        return next;
      });
    },
    [userId]
  );

  const dismissOutfit = useCallback(
    (id: string) => {
      setDismissed(prev => {
        const next = prev.includes(id) ? prev : [...prev, id];
        try {
          window.localStorage.setItem(getDismissedKey(userId), JSON.stringify(next));
        } catch {
          // ignore storage error
        }
        return next;
      });
    },
    [userId]
  );

  const resetDismissed = useCallback(() => {
    setDismissed([]);
    try {
      window.localStorage.removeItem(getDismissedKey(userId));
    } catch {
      // ignore storage error
    }
  }, [userId]);

  const capsule = useQuery({
    queryKey: ['capsule'],
    queryFn: ({ signal }) => listCapsuleGarments(signal),
  });

  const recommend = useQuery({
    queryKey: ['outfits', 'recommend', me?.user_id, targetAesthetic],
    queryFn: ({ signal }) => {
      if (!me) throw new Error('sin identidad del backend');
      return recommendOutfits(
        {
          user_id: me.user_id,
          target_aesthetic: targetAesthetic,
        },
        signal
      );
    },
    enabled: Boolean(me),
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });

  const images = new Map<string, GarmentSummary>(
    (capsule.data?.garments ?? []).map(g => [g.id, g])
  );

  const goTryOn = (outfitId: string): void => {
    router.push(`/try-on?outfit=${encodeURIComponent(outfitId)}`);
  };

  if (meError) {
    return (
      <div className="rounded-lg border border-border p-6 text-center">
        <p className="text-sm text-muted-foreground">
          No pudimos identificar tu usuario en el backend. ¿Está el servicio levantado?
        </p>
        <Button
          type="button"
          variant="secondary"
          className="mt-4"
          onClick={() => window.location.reload()}
        >
          Reintentar
        </Button>
      </div>
    );
  }

  if (meLoading || recommend.isPending) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-label="Cargando outfits">
        {[0, 1, 2].map(i => (
          <Skeleton key={i} className="h-72 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (recommend.isError) {
    const vacio = capsule.data && capsule.data.garments.length === 0;
    return (
      <div className="rounded-lg border border-border p-6 text-center">
        <p className="font-semibold">
          {vacio ? 'Tu armario está vacío' : 'No hay outfits para armar'}
        </p>
        <p className="mt-2 text-sm text-muted-foreground">{describeFailure(recommend.error)}</p>
        <Button type="button" className="mt-4" onClick={() => router.push('/wardrobe')}>
          {vacio ? 'Subir prendas' : 'Completar el armario'}
        </Button>
      </div>
    );
  }

  const allOutfits = recommend.data?.outfits ?? [];
  const activeOutfits = allOutfits.filter(o => !dismissed.includes(o.outfit_id));

  if (allOutfits.length === 0) {
    return (
      <div className="rounded-lg border border-border p-6 text-center">
        <p className="font-semibold">Todavía no hay combinaciones</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Necesitas al menos una prenda superior y una inferior para armar un outfit.
        </p>
        <Button type="button" className="mt-4" onClick={() => router.push('/wardrobe')}>
          Ir al armario
        </Button>
      </div>
    );
  }

  if (activeOutfits.length === 0) {
    return (
      <div className="rounded-lg border border-border p-6 text-center">
        <p className="font-semibold">Descartaste todas las combinaciones</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Puedes restablecer las combinaciones descartadas para volver a verlas.
        </p>
        <Button
          type="button"
          className="mt-4 inline-flex items-center gap-2"
          onClick={resetDismissed}
        >
          <RotateCcw className="h-4 w-4" aria-hidden="true" />
          <span>Restablecer combinaciones</span>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toolbar Bento */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl border border-border/80 bg-background/80 backdrop-blur-sm shadow-2xs">
        <div className="flex items-center gap-2 pl-2">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          <p className="text-xs sm:text-sm font-medium text-foreground">
            {activeOutfits.length}{' '}
            {activeOutfits.length === 1 ? 'combinación para ti' : 'combinaciones para ti'}
          </p>
          {queryAesthetic && (
            <Badge
              variant="outline"
              className="ml-2 border-accent/40 bg-accent/10 text-accent font-mono text-xs px-2.5 py-0.5 inline-flex items-center gap-1.5"
            >
              <span>Filtro: {queryAesthetic.replace(/_/g, ' ')}</span>
              <button
                type="button"
                onClick={() => router.push('/outfits')}
                className="hover:text-destructive transition-colors ml-1"
                aria-label="Quitar filtro de estética"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          {dismissed.length > 0 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={resetDismissed}
              className="text-xs rounded-full h-8 inline-flex items-center gap-1.5"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Restablecer ({dismissed.length})</span>
            </Button>
          )}
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="text-xs rounded-full h-8"
            onClick={() => recommend.refetch()}
            disabled={recommend.isFetching}
          >
            {recommend.isFetching ? 'Recomendando…' : 'Recomendar de nuevo'}
          </Button>
        </div>
      </div>

      {/* Grid de Outfits Bento */}
      {activeOutfits.length === 1 ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          <div className="lg:col-span-7">
            <OutfitCard
              outfit={activeOutfits[0]!}
              images={images}
              feedback={feedbackMap[activeOutfits[0]!.outfit_id]}
              onTryOn={goTryOn}
              onDismiss={dismissOutfit}
              onFeedback={handleFeedback}
            />
          </div>
          <div className="lg:col-span-5">
            <Card className="h-full flex flex-col justify-between rounded-3xl border border-border/80 bg-background/85 backdrop-blur-sm shadow-sm p-6 sm:p-7">
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-foreground font-semibold">
                  <Sparkles className="h-4 w-4 text-accent" />
                  <h3 className="text-base font-bold tracking-tight">Expande tu armario</h3>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed text-pretty">
                  Actualmente tienes 1 combinación recomendada con tus prendas disponibles. Puedes
                  agregar más prendas al armario o adoptar piezas de la cápsula para desbloquear
                  nuevas combinaciones cromáticas.
                </p>
                <div className="space-y-2 pt-2 text-xs text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                    <span>Colores complementarios para mayor contraste</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                    <span>Colores análogos para un look más sobrio</span>
                  </div>
                </div>
              </div>
              <div className="pt-6 border-t border-border/60">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full rounded-full text-xs h-10"
                  onClick={() => router.push('/wardrobe')}
                >
                  Ir al armario a sumar prendas
                </Button>
              </div>
            </Card>
          </div>
        </div>
      ) : (
        <div
          className={cn(
            'stagger grid gap-6 items-stretch',
            activeOutfits.length === 2
              ? 'grid-cols-1 md:grid-cols-2'
              : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
          )}
        >
          {activeOutfits.map(o => (
            <OutfitCard
              key={o.outfit_id}
              outfit={o}
              images={images}
              feedback={feedbackMap[o.outfit_id]}
              onTryOn={goTryOn}
              onDismiss={dismissOutfit}
              onFeedback={handleFeedback}
            />
          ))}
        </div>
      )}
    </div>
  );
}
