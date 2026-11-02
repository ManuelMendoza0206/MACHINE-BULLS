'use client';

import { useCallback, useState, type JSX } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Sparkles, ArrowRight, X, RotateCcw } from 'lucide-react';
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
  return 'No pudimos cargar los outfits. Revisá tu conexión e intentá de nuevo.';
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

interface OutfitCardProps {
  outfit: Outfit;
  images: Map<string, GarmentSummary>;
  onTryOn: (outfitId: string) => void;
  onDismiss: (outfitId: string) => void;
}

function OutfitCard({ outfit, images, onTryOn, onDismiss }: OutfitCardProps): JSX.Element {
  const chromaPct = Math.round(outfit.chromatic_score * 100);
  const embPct = Math.round(outfit.embedding_score * 100);

  return (
    <Card className="overflow-hidden rounded-2xl sm:rounded-3xl border border-border/80 bg-background/80 backdrop-blur-sm shadow-xs transition-all hover:border-accent/40 hover:shadow-md">
      <CardHeader className="flex-row items-center justify-between space-y-0 p-5 sm:p-6 pb-2">
        <h2 className="text-lg font-semibold capitalize tracking-tight">
          {outfit.aesthetic.replace(/_/g, ' ')}
        </h2>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="border-accent/30 text-accent font-mono text-xs">
            {outfit.garments.length} prendas
          </Badge>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onDismiss(outfit.outfit_id)}
            className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive transition-colors"
            aria-label={`Descartar outfit ${outfit.aesthetic.replace(/_/g, ' ')}`}
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 p-5 sm:p-6 pt-2">
        <ul className="grid grid-cols-4 gap-2" aria-label="Prendas del outfit">
          {outfit.garments.map(ref => {
            const garment = images.get(ref.garment_id);
            const alt = garment
              ? `${garment.category}, estética ${garment.dominant_aesthetic}`
              : POSITION_LABEL[ref.position];
            return (
              <li
                key={ref.garment_id}
                className="relative aspect-square overflow-hidden rounded-xl bg-muted/60 border border-border/50"
              >
                {garment ? (
                  // eslint-disable-next-line @next/next/no-img-element -- URL arbitraria del backend (schema .url(), sin host restringido)
                  <img
                    src={garment.processed_image_url}
                    alt={alt}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
                  />
                ) : (
                  <span className="flex h-full items-center justify-center p-1 text-center text-xs text-muted-foreground">
                    {POSITION_LABEL[ref.position]}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
        <div className="space-y-3 pt-1">
          <div>
            <div className="mb-1.5 flex justify-between text-xs text-muted-foreground">
              <span>Armonía cromática</span>
              <span className="font-semibold text-accent">{chromaPct}%</span>
            </div>
            <Progress value={chromaPct} aria-label="Armonía cromática" />
          </div>
          <div>
            <div className="mb-1.5 flex justify-between text-xs text-muted-foreground">
              <span>Compatibilidad de estilo</span>
              <span className="font-semibold text-accent">{embPct}%</span>
            </div>
            <Progress value={embPct} aria-label="Compatibilidad de estilo" />
          </div>
        </div>
      </CardContent>
      <CardFooter className="p-5 sm:p-6 pt-0">
        <Button
          type="button"
          onClick={() => onTryOn(outfit.outfit_id)}
          className="w-full min-h-11 rounded-xl shadow-xs inline-flex items-center justify-center gap-2 font-medium"
        >
          <Sparkles className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>Probar puesto en Probador</span>
          <ArrowRight className="h-4 w-4 shrink-0" aria-hidden="true" />
        </Button>
      </CardFooter>
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
  const { data: me, isLoading: meLoading, error: meError } = useMe();
  const userId = me?.user_id;

  const [dismissed, setDismissed] = useState<string[]>(() => getStoredDismissed(userId));

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
    queryKey: ['outfits', 'recommend', me?.user_id],
    queryFn: ({ signal }) => {
      if (!me) throw new Error('sin identidad del backend');
      return recommendOutfits({ user_id: me.user_id }, signal);
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
          Necesitás al menos una prenda superior y una inferior para armar un outfit.
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
          Podés restablecer las combinaciones descartadas para volver a verlas.
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
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {activeOutfits.length} combinaciones para vos
        </p>
        <div className="flex items-center gap-2">
          {dismissed.length > 0 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={resetDismissed}
              className="text-xs inline-flex items-center gap-1.5"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Restablecer ({dismissed.length})</span>
            </Button>
          )}
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => recommend.refetch()}
            disabled={recommend.isFetching}
          >
            {recommend.isFetching ? 'Recomendando…' : 'Recomendar de nuevo'}
          </Button>
        </div>
      </div>
      <div className="stagger grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {activeOutfits.map(o => (
          <OutfitCard
            key={o.outfit_id}
            outfit={o}
            images={images}
            onTryOn={goTryOn}
            onDismiss={dismissOutfit}
          />
        ))}
      </div>
    </div>
  );
}
