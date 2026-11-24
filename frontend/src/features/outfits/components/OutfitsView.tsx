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
import {
  Sparkles,
  ArrowRight,
  X,
  RotateCcw,
  ThumbsUp,
  ThumbsDown,
  Check,
  CloudSun,
  ShoppingBag,
  Shuffle,
  Calendar,
  Pin,
  CheckCircle2,
  Wand2,
  Layers,
  LocateFixed,
} from 'lucide-react';
import { useMe } from '@/features/auth/hooks/useMe';
import { listCapsuleGarments } from '@/features/garments/api/listCapsuleGarments';
import { listGarments } from '@/features/garments/api/listGarments';
import { recommendOutfits } from '@/features/outfits/api/recommendOutfits';
import { remixOutfit } from '@/features/outfits/api/remixOutfit';
import { submitOutfitFeedback } from '@/features/outfits/api/submitOutfitFeedback';
import { wearOutfit } from '@/features/outfits/api/wearOutfit';
import { ManualOutfitBuilderModal } from '@/features/outfits/components/ManualOutfitBuilderModal';
import { StylistAdviceModal } from '@/features/outfits/components/StylistAdviceModal';
import { createOutfitPlan } from '@/features/planner/api/plannerApi';
import { fetchCurrentWeather } from '@/features/shopping/api/fetchCurrentWeather';
import { mapStatusToUserMessage } from '@/lib/api/mapStatusToUserMessage';
import { ApiError } from '@/lib/errors';
import type { Outfit, OutfitPosition } from '@/schemas/api/outfits';
import type { GarmentSummary } from '@/schemas/api/garments';

const POSITION_LABEL: Record<OutfitPosition, string> = {
  top: 'Parte superior',
  bottom: 'Parte inferior',
  dress: 'Vestido',
  footwear: 'Calzado',
  outerwear: 'Abrigo',
  bag: 'Bolso',
};

const WEATHER_CITIES = [
  'La Paz',
  'Cochabamba',
  'Santa Cruz',
  'Sucre',
  'Tarija',
  'Oruro',
  'Potosí',
] as const;

const WEATHER_CITY_STORAGE_KEY = 'styleme:weather-city';

function getStoredWeatherCity(): string {
  if (typeof window === 'undefined') return 'La Paz';
  try {
    const saved = window.localStorage.getItem(WEATHER_CITY_STORAGE_KEY);
    if (saved && (WEATHER_CITIES as readonly string[]).includes(saved)) {
      return saved;
    }
  } catch {
    // ignore storage errors
  }
  return 'La Paz';
}

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
  isWornToday?: boolean;
  onTryOn: (outfitId: string) => void;
  onDismiss: (outfitId: string) => void;
  onFeedback: (outfitId: string, type: 'like' | 'dislike') => void;
  onWear?: (outfitId: string) => void;
  onOpenRemix?: (outfit: Outfit) => void;
  onSchedulePlan?: (outfit: Outfit) => void;
  onAskStylist?: (outfit: Outfit) => void;
}

function OutfitCard({
  outfit,
  images,
  feedback,
  isWornToday,
  onTryOn,
  onDismiss,
  onFeedback,
  onWear,
  onOpenRemix,
  onSchedulePlan,
  onAskStylist,
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

        {outfit.reason && (
          <div className="rounded-2xl bg-accent/5 border border-accent/20 px-3.5 py-2.5 text-xs text-foreground/90">
            <span className="font-semibold text-accent mr-1">Por qué combina:</span>
            <span>{outfit.reason}</span>
          </div>
        )}

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onAskStylist?.(outfit)}
          aria-label={`Consultar al estilista IA para ${outfit.aesthetic.replace(/_/g, ' ')}`}
          className="h-8 rounded-full px-3 text-xs text-accent hover:bg-accent/10 hover:text-accent gap-1.5 w-fit"
        >
          <Wand2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>Profundizar con Estilista IA</span>
        </Button>

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
          <span>Probar puesto</span>
          <ArrowRight className="h-4 w-4 shrink-0" aria-hidden="true" />
        </Button>
        <Button
          type="button"
          variant={isWornToday ? 'secondary' : 'outline'}
          size="sm"
          onClick={() => onWear?.(outfit.outfit_id)}
          className={cn(
            'h-11 rounded-full px-3 text-xs gap-1.5 shrink-0 transition-colors',
            isWornToday && 'text-emerald-600 border-emerald-500/40 bg-emerald-500/10'
          )}
          aria-label={`Marcar como usado hoy outfit ${outfit.aesthetic.replace(/_/g, ' ')}`}
        >
          <Check
            className={cn('h-4 w-4', isWornToday ? 'text-emerald-600' : 'text-muted-foreground')}
          />
          <span className="hidden sm:inline">{isWornToday ? 'Usado' : 'Usar hoy'}</span>
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onOpenRemix?.(outfit)}
          className="h-11 w-11 p-0 rounded-full shrink-0 transition-colors hover:text-accent"
          aria-label={`Personalizar o cambiar prendas de ${outfit.aesthetic.replace(/_/g, ' ')}`}
          title="Remix / Cambiar prendas"
        >
          <Shuffle className="h-4 w-4" aria-hidden="true" />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onSchedulePlan?.(outfit)}
          className="h-11 w-11 p-0 rounded-full shrink-0 transition-colors hover:text-accent"
          aria-label={`Agendar outfit ${outfit.aesthetic.replace(/_/g, ' ')} en el planificador`}
          title="Agendar en el calendario"
        >
          <Calendar className="h-4 w-4" aria-hidden="true" />
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
  const [wornMap, setWornMap] = useState<Record<string, boolean>>({});
  const [selectedOccasion, setSelectedOccasion] = useState<string>('all');

  // Estado para Outfit Remix
  const [remixOutfitTarget, setRemixOutfitTarget] = useState<Outfit | null>(null);
  const [pinnedGarmentIds, setPinnedGarmentIds] = useState<string[]>([]);
  const [isRemixing, setIsRemixing] = useState<boolean>(false);
  const [remixSuccessMessage, setRemixSuccessMessage] = useState<string | null>(null);

  // Estado para agendar en Outfit Planner
  const [scheduleOutfitTarget, setScheduleOutfitTarget] = useState<Outfit | null>(null);
  const [scheduleDate, setScheduleDate] = useState<string>(
    () => new Date().toISOString().split('T')[0] ?? ''
  );
  const [isScheduling, setIsScheduling] = useState<boolean>(false);

  // Estado para Asesor de Moda Virtual (Estilista IA) y Armador Manual
  const [stylistTarget, setStylistTarget] = useState<Outfit | null>(null);
  const [isManualBuilderOpen, setIsManualBuilderOpen] = useState<boolean>(false);

  // Estado configurable para ciudad / GPS del clima
  const [selectedCity, setSelectedCity] = useState<string>(() => getStoredWeatherCity());
  const [gpsCoords, setGpsCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [locatingGps, setLocatingGps] = useState<boolean>(false);

  const weatherQuery = useQuery({
    queryKey: [
      'weather',
      'current',
      gpsCoords ? `${gpsCoords.lat.toFixed(2)},${gpsCoords.lon.toFixed(2)}` : selectedCity,
    ],
    queryFn: ({ signal }) =>
      fetchCurrentWeather(
        gpsCoords ? { lat: gpsCoords.lat, lon: gpsCoords.lon } : { city: selectedCity },
        signal
      ),
    staleTime: 1000 * 60 * 30, // 30 min
    refetchOnWindowFocus: false,
  });

  const handleSelectCity = useCallback((city: string) => {
    setGpsCoords(null);
    setSelectedCity(city);
    try {
      window.localStorage.setItem(WEATHER_CITY_STORAGE_KEY, city);
    } catch {
      // ignore storage error
    }
  }, []);

  const handleUseGps = useCallback(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) return;
    setLocatingGps(true);
    navigator.geolocation.getCurrentPosition(
      pos => {
        setGpsCoords({ lat: pos.coords.latitude, lon: pos.coords.longitude });
        setLocatingGps(false);
      },
      () => {
        setLocatingGps(false);
      },
      { timeout: 6_000 }
    );
  }, []);

  const handleWear = useCallback((id: string) => {
    setWornMap(prev => ({ ...prev, [id]: true }));
    wearOutfit(id).catch(() => {
      // Estado optimista
    });
  }, []);

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

      // Persistir en backend (PostgreSQL) para aprendizaje del recomendador
      const rating = type === 'like' ? 1 : -1;
      submitOutfitFeedback(id, { rating, feedback_type: type }).catch(() => {
        // En caso de error de red, el estado local ya mantiene la reactividad visual
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

  const myGarments = useQuery({
    queryKey: ['garments-list'],
    queryFn: ({ signal }) => listGarments(signal),
  });

  const recommend = useQuery({
    queryKey: [
      'outfits',
      'recommend',
      me?.user_id,
      targetAesthetic,
      selectedOccasion,
      weatherQuery.data?.weather_type,
    ],
    queryFn: ({ signal }) => {
      if (!me) throw new Error('sin identidad del backend');
      return recommendOutfits(
        {
          user_id: me.user_id,
          target_aesthetic: targetAesthetic,
          occasion: selectedOccasion === 'all' ? undefined : selectedOccasion,
          weather: weatherQuery.data?.weather_type,
        },
        signal
      );
    },
    enabled: Boolean(me),
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });

  const images = new Map<string, GarmentSummary>();
  for (const g of capsule.data?.garments ?? []) {
    images.set(g.id, g);
  }
  for (const g of myGarments.data?.garments ?? []) {
    images.set(g.id, g);
  }

  const goTryOn = (outfitId: string): void => {
    router.push(`/try-on?outfit=${encodeURIComponent(outfitId)}`);
  };

  const handleOpenRemix = (outfit: Outfit) => {
    setRemixOutfitTarget(outfit);
    setPinnedGarmentIds(outfit.garments[0] ? [outfit.garments[0].garment_id] : []);
  };

  const handleTogglePin = useCallback((garmentId: string) => {
    setPinnedGarmentIds(prev =>
      prev.includes(garmentId) ? prev.filter(id => id !== garmentId) : [...prev, garmentId]
    );
  }, []);

  const handleExecuteRemix = async () => {
    if (!userId || !remixOutfitTarget || pinnedGarmentIds.length === 0) return;
    setIsRemixing(true);
    try {
      await remixOutfit({
        user_id: userId,
        pinned_garment_ids: pinnedGarmentIds,
        occasion: selectedOccasion === 'all' ? undefined : selectedOccasion,
        weather: weatherQuery.data?.weather_type,
      });
      recommend.refetch();
      setRemixOutfitTarget(null);
      setRemixSuccessMessage(
        '¡Combinaciones alternativas generadas manteniendo tus prendas ancladas!'
      );
      setTimeout(() => setRemixSuccessMessage(null), 4000);
    } catch (err: unknown) {
      console.error(err);
    } finally {
      setIsRemixing(false);
    }
  };

  const handleOpenSchedule = (outfit: Outfit) => {
    setScheduleOutfitTarget(outfit);
  };

  const handleExecuteSchedule = async () => {
    if (!userId || !scheduleOutfitTarget) return;
    setIsScheduling(true);
    try {
      await createOutfitPlan({
        user_id: userId,
        planned_date: scheduleDate,
        garment_ids: scheduleOutfitTarget.garments.map(g => g.garment_id),
        outfit_id: scheduleOutfitTarget.outfit_id,
        occasion: selectedOccasion === 'all' ? 'Casual' : selectedOccasion,
      });
      setScheduleOutfitTarget(null);
      setRemixSuccessMessage('¡Outfit programado en tu planificador!');
      setTimeout(() => setRemixSuccessMessage(null), 4000);
    } catch (err: unknown) {
      console.error(err);
    } finally {
      setIsScheduling(false);
    }
  };

  if (meError) {
    return (
      <div className="rounded-2xl border border-border/80 bg-background/85 p-6 text-center">
        <p className="text-sm text-muted-foreground">
          No pudimos conectar con tu cuenta. Por favor recarga la página o inténtalo en unos
          minutos.
        </p>
        <Button
          type="button"
          variant="secondary"
          className="mt-4 rounded-full text-xs"
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
      <>
        <div className="rounded-lg border border-border p-6 text-center">
          <p className="font-semibold">Todavía no hay combinaciones</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Necesitas al menos una prenda superior y una inferior para armar un outfit.
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <Button type="button" onClick={() => router.push('/wardrobe')}>
              Ir al armario
            </Button>
            <Button type="button" variant="outline" onClick={() => setIsManualBuilderOpen(true)}>
              Armar manualmente
            </Button>
          </div>
        </div>
        {isManualBuilderOpen && (
          <ManualOutfitBuilderModal
            occasion={selectedOccasion === 'all' ? undefined : selectedOccasion}
            weather={weatherQuery.data?.weather_type}
            onClose={() => setIsManualBuilderOpen(false)}
            onTryOn={id => {
              setIsManualBuilderOpen(false);
              goTryOn(id);
            }}
            onAskStylist={outfit => {
              setIsManualBuilderOpen(false);
              setStylistTarget(outfit);
            }}
          />
        )}
      </>
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

  const OCCASIONS = [
    { id: 'all', label: 'Todas las ocasiones' },
    { id: 'casual', label: 'Casual' },
    { id: 'work', label: 'Trabajo / Formal' },
    { id: 'university', label: 'Universidad' },
    { id: 'party', label: 'Fiesta' },
    { id: 'sport', label: 'Deporte' },
  ];

  return (
    <div className="space-y-6">
      {remixSuccessMessage && (
        <div
          role="status"
          className="flex items-center gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-xs font-medium text-emerald-800 dark:text-emerald-300"
        >
          <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>{remixSuccessMessage}</span>
        </div>
      )}

      {/* Contextual Header Bar: Clima y Ocasión */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-3xl border border-border/80 bg-background/85 backdrop-blur-sm shadow-xs">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-semibold text-muted-foreground mr-1.5">Ocasión:</span>
          {OCCASIONS.map(occ => (
            <button
              key={occ.id}
              type="button"
              onClick={() => setSelectedOccasion(occ.id)}
              className={cn(
                'rounded-full px-3 py-1 text-xs font-medium transition-all',
                selectedOccasion === occ.id
                  ? 'bg-accent text-accent-foreground font-semibold shadow-xs'
                  : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              {occ.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0 self-start sm:self-auto">
          {weatherQuery.data && (
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 border border-accent/20 text-accent text-xs font-medium">
              <CloudSun className="h-3.5 w-3.5" aria-hidden="true" />
              <span>
                {weatherQuery.data.city}: {Math.round(weatherQuery.data.temp_c)}°C (
                {weatherQuery.data.weather_type === 'cold'
                  ? 'Frío'
                  : weatherQuery.data.weather_type === 'warm'
                    ? 'Cálido'
                    : 'Templado'}
                )
              </span>
            </div>
          )}
          <select
            aria-label="Ciudad para el clima"
            value={selectedCity}
            onChange={e => handleSelectCity(e.target.value)}
            className="rounded-full border border-border bg-muted/40 px-2.5 py-1 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-accent"
          >
            {WEATHER_CITIES.map(city => (
              <option key={city} value={city}>
                {city}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={handleUseGps}
            disabled={locatingGps}
            aria-label="Usar mi ubicación GPS"
            title="Usar mi ubicación GPS"
            className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-border bg-muted/40 text-muted-foreground hover:text-accent hover:border-accent/40 transition-colors disabled:opacity-50"
          >
            <LocateFixed className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Banner Smart Shopping */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-2xl bg-muted/40 border border-border/60">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-accent/10 flex items-center justify-center text-accent shrink-0">
            <ShoppingBag className="h-4 w-4" aria-hidden="true" />
          </div>
          <p className="text-xs text-muted-foreground">
            <span className="font-semibold text-foreground mr-1">Antes de comprar:</span>
            ¿Pensando en comprar ropa? Sube una foto de la tienda para saber si ya tienes algo
            parecido y con qué combinarla.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => router.push('/shopping')}
          className="text-xs rounded-full h-8 shrink-0"
        >
          Evaluar antes de comprar
        </Button>
      </div>

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
            variant="outline"
            size="sm"
            className="text-xs rounded-full h-8 inline-flex items-center gap-1.5"
            onClick={() => setIsManualBuilderOpen(true)}
          >
            <Layers className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Armar manualmente</span>
          </Button>
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
              isWornToday={Boolean(wornMap[activeOutfits[0]!.outfit_id])}
              onWear={handleWear}
              onTryOn={goTryOn}
              onDismiss={dismissOutfit}
              onFeedback={handleFeedback}
              onOpenRemix={handleOpenRemix}
              onSchedulePlan={handleOpenSchedule}
              onAskStylist={setStylistTarget}
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
                  agregar más prendas al armario o adoptar piezas de la cápsula para descubrir
                  nuevas combinaciones para tu estilo.
                </p>
                <div className="space-y-2 pt-2 text-xs text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                    <span>Tonos vivos para resaltar el contraste</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                    <span>Tonos similares para un look más armonioso</span>
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
              isWornToday={Boolean(wornMap[o.outfit_id])}
              onWear={handleWear}
              onTryOn={goTryOn}
              onDismiss={dismissOutfit}
              onFeedback={handleFeedback}
              onOpenRemix={handleOpenRemix}
              onSchedulePlan={handleOpenSchedule}
              onAskStylist={setStylistTarget}
            />
          ))}
        </div>
      )}

      {/* Modal Outfit Remix */}
      {remixOutfitTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-border bg-background p-6 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-border/40">
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                <Shuffle className="h-4 w-4 text-accent" />
                Outfit Remix
              </h3>
              <button
                type="button"
                onClick={() => setRemixOutfitTarget(null)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="text-xs text-muted-foreground my-3">
              Fija las prendas que te encantan de este conjunto. El recomendador buscará
              alternativas compatibles para reemplazar las demás piezas.
            </p>

            <div className="grid grid-cols-3 gap-2.5 my-4">
              {remixOutfitTarget.garments.map(ref => {
                const g = images.get(ref.garment_id);
                const isPinned = pinnedGarmentIds.includes(ref.garment_id);
                return (
                  <button
                    key={ref.garment_id}
                    type="button"
                    onClick={() => handleTogglePin(ref.garment_id)}
                    className={cn(
                      'relative flex flex-col items-center rounded-2xl border p-2 text-center transition-all cursor-pointer',
                      isPinned
                        ? 'border-accent bg-accent/15 ring-2 ring-accent'
                        : 'border-border/60 hover:border-border bg-muted/20 opacity-70'
                    )}
                  >
                    <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-background mb-1">
                      {g ? (
                        <>
                          {/* eslint-disable-next-line @next/next/no-img-element -- garment image URLs come from Azure/local dynamic hosts */}
                          <img
                            src={g.processed_image_url}
                            alt={g.category}
                            className="h-full w-full object-cover"
                          />
                        </>
                      ) : (
                        <div className="flex h-full items-center justify-center text-[10px] text-muted-foreground">
                          {ref.position}
                        </div>
                      )}
                    </div>
                    <span className="text-[10px] font-semibold text-foreground truncate w-full">
                      {g?.category || ref.position}
                    </span>
                    <span
                      className={cn(
                        'mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-medium',
                        isPinned
                          ? 'bg-accent text-accent-foreground'
                          : 'bg-muted text-muted-foreground'
                      )}
                    >
                      <Pin className="h-2.5 w-2.5" />
                      {isPinned ? 'Fijada' : 'Variar'}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-border/40">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setRemixOutfitTarget(null)}
                className="rounded-xl text-xs h-9"
              >
                Cancelar
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={isRemixing || pinnedGarmentIds.length === 0}
                onClick={handleExecuteRemix}
                className="rounded-xl text-xs h-9 gap-1.5"
              >
                <Shuffle className="h-3.5 w-3.5" />
                <span>{isRemixing ? 'Generando remix...' : 'Generar alternativas'}</span>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Agendar en Planificador */}
      {scheduleOutfitTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl border border-border bg-background p-6 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-border/40">
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                <Calendar className="h-4 w-4 text-accent" />
                Agendar en el calendario
              </h3>
              <button
                type="button"
                onClick={() => setScheduleOutfitTarget(null)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="text-xs text-muted-foreground my-3">
              ¿Para qué día deseas programar este conjunto de{' '}
              {scheduleOutfitTarget.aesthetic.replace(/_/g, ' ')}?
            </p>

            <div className="space-y-3 my-4">
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">Fecha</label>
                <input
                  type="date"
                  value={scheduleDate}
                  onChange={e => setScheduleDate(e.target.value)}
                  className="w-full rounded-xl border border-border bg-muted/40 px-3 py-2 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-accent"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-border/40">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setScheduleOutfitTarget(null)}
                className="rounded-xl text-xs h-9"
              >
                Cerrar
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={isScheduling}
                onClick={handleExecuteSchedule}
                className="rounded-xl text-xs h-9 gap-1.5"
              >
                <Calendar className="h-3.5 w-3.5" />
                <span>{isScheduling ? 'Agendando...' : 'Confirmar fecha'}</span>
              </Button>
            </div>
          </div>
        </div>
      )}

      <StylistAdviceModal
        outfit={stylistTarget}
        occasion={selectedOccasion === 'all' ? undefined : selectedOccasion}
        weather={weatherQuery.data?.weather_type}
        onClose={() => setStylistTarget(null)}
      />

      {isManualBuilderOpen && (
        <ManualOutfitBuilderModal
          occasion={selectedOccasion === 'all' ? undefined : selectedOccasion}
          weather={weatherQuery.data?.weather_type}
          onClose={() => setIsManualBuilderOpen(false)}
          onTryOn={id => {
            setIsManualBuilderOpen(false);
            goTryOn(id);
          }}
          onAskStylist={outfit => {
            setIsManualBuilderOpen(false);
            setStylistTarget(outfit);
          }}
        />
      )}
    </div>
  );
}
