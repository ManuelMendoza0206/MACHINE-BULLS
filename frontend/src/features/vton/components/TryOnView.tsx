'use client';

import { useEffect, useRef, useState, type JSX } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { PhotoConsentGate } from '@/features/garments/components/PhotoConsentGate';
import { GarmentDropzone } from '@/features/garments/components/GarmentDropzone';
import { listCapsuleGarments } from '@/features/garments/api/listCapsuleGarments';
import { getOutfit } from '@/features/outfits/api/getOutfit';
import { recommendOutfits } from '@/features/outfits/api/recommendOutfits';
import { useMe } from '@/features/auth/hooks/useMe';
import { createVtonJob } from '@/features/vton/api/createVtonJob';
import { getVtonJobStatus } from '@/features/vton/api/getVtonJobStatus';
import { mapStatusToUserMessage } from '@/lib/api/mapStatusToUserMessage';
import { ApiError } from '@/lib/errors';
import type { OutfitPosition } from '@/schemas/api/outfits';
import { CheckCircle2, Layers, RefreshCw, ShieldAlert } from 'lucide-react';

const POSITION_LABEL: Record<OutfitPosition, string> = {
  top: 'Parte superior',
  bottom: 'Parte inferior',
  footwear: 'Calzado',
  outerwear: 'Abrigo',
};

/** Techo de polling configurable por build (ms). El job NUNCA se cancela al alcanzarlo. */
const POLL_TIMEOUT_MS = Number(process.env['NEXT_PUBLIC_VTON_POLL_TIMEOUT_MS'] ?? 90_000);
/** Backoff: 1s, 1.5s, 2.25s… techo 5s. */
const POLL_BASE_MS = 1_000;
const POLL_MAX_MS = 5_000;

type Phase = 'idle' | 'processing' | 'completed' | 'failed' | 'timeout';

function describeCreateError(error: unknown): string {
  if (error instanceof ApiError) return mapStatusToUserMessage(error.status, error.responseBody);
  return 'No pudimos generar la prueba. Revisá tu conexión e intentá de nuevo.';
}

/**
 * `/try-on` composition root: outfit elegido en `/outfits` (query `?outfit=<id>`),
 * foto del usuario y ciclo de vida del job VTON (crear → poll con backoff →
 * resultado | fallo | timeout local).
 *
 * Decisiones alineadas con vton-flow/spec.md:
 * - Protección de doble submit: el botón queda deshabilitado mientras la
 *   creación del job está en vuelo (la mutación más costosa).
 * - Polling con backoff exponencial y timeout LOCAL: al agotarse el techo se
 *   muestra un estado de timeout con opción de reanudar la consulta; el job
 *   sigue vivo en el backend (no se manda ninguna cancelación).
 * - Todo mensaje mostrado es de negocio (`error_message` del backend), jamás
 *   un stack trace.
 */
export function TryOnView(): JSX.Element {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryOutfitId = searchParams.get('outfit');

  const { data: me } = useMe();
  const recommendedQuery = useQuery({
    queryKey: ['outfits', 'recommend', me?.user_id],
    queryFn: ({ signal }) => {
      if (!me) throw new Error('sin identidad del backend');
      return recommendOutfits({ user_id: me.user_id }, signal);
    },
    enabled: Boolean(me),
    staleTime: 60_000,
  });

  const availableOutfits = recommendedQuery.data?.outfits ?? [];
  const effectiveOutfitId = queryOutfitId ?? availableOutfits[0]?.outfit_id ?? null;

  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>('idle');
  const [jobId, setJobId] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [elapsedSec, setElapsedSec] = useState(0);
  const startedAtRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const outfit = useQuery({
    queryKey: ['outfit', effectiveOutfitId],
    queryFn: ({ signal }) => getOutfit(effectiveOutfitId as string, signal),
    enabled: Boolean(effectiveOutfitId),
  });

  const capsule = useQuery({
    queryKey: ['capsule'],
    queryFn: ({ signal }) => listCapsuleGarments(signal),
  });

  const createJob = useMutation({
    mutationFn: (vars: { image: File; id: string }) => createVtonJob(vars.image, vars.id),
  });

  // Contador de tiempo de inferencia
  useEffect(() => {
    if (phase !== 'processing') return;
    const interval = setInterval(() => {
      setElapsedSec(s => s + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [phase]);

  // Loop de polling: cada re-ejecución de `attempt` agenda la próxima consulta
  // con backoff; el cleanup cancela el timer si la vista se desmonta.
  useEffect(() => {
    if (phase !== 'processing' || !jobId) return;

    if (Date.now() - startedAtRef.current > POLL_TIMEOUT_MS) {
      setPhase('timeout');
      return;
    }

    const delay = Math.min(POLL_BASE_MS * 1.5 ** attempt, POLL_MAX_MS);
    timerRef.current = setTimeout(() => {
      void getVtonJobStatus(jobId)
        .then(status => {
          if (status.status === 'completed') {
            setResultUrl(status.result_url ?? null);
            setPhase('completed');
          } else if (status.status === 'failed') {
            setFailure(status.error_message ?? 'No pudimos generar la prueba virtual.');
            setPhase('failed');
          } else {
            setAttempt(a => a + 1);
          }
        })
        .catch(() => setAttempt(a => a + 1)); // error transitorio: el backoff reintenta
    }, delay);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [phase, jobId, attempt]);

  const resetPhoto = (): void => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(null);
    setPreviewUrl(null);
    setResultUrl(null);
    setFailure(null);
    setCreateError(null);
    setJobId(null);
    setAttempt(0);
    setElapsedSec(0);
    setPhase('idle');
  };

  const loadSample = async (url: string, filename: string): Promise<void> => {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const sampleFile = new File([blob], filename, { type: 'image/jpeg' });
      handleFiles([sampleFile]);
    } catch {
      // Entornos de prueba o sin fetch disponible
    }
  };

  const handleFiles = (files: File[]): void => {
    const first = files[0];
    if (!first) return;
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(first);
    setPreviewUrl(URL.createObjectURL(first));
    setCreateError(null);
  };

  const submit = (): void => {
    // Doble-submit: no re-entra mientras la creación del job esté en vuelo
    // ni mientras haya un job corriendo.
    if (!file || !effectiveOutfitId || createJob.isPending || phase === 'processing') return;
    setCreateError(null);
    setElapsedSec(0);
    createJob.mutate(
      { image: file, id: effectiveOutfitId },
      {
        onSuccess: job => {
          setJobId(job.job_id);
          startedAtRef.current = Date.now();
          setAttempt(0);
          setPhase('processing');
        },
        onError: error => setCreateError(describeCreateError(error)),
      }
    );
  };

  const resumePolling = (): void => {
    startedAtRef.current = Date.now();
    setAttempt(0);
    setElapsedSec(0);
    setPhase('processing');
  };

  if (!effectiveOutfitId) {
    return (
      <div className="rounded-lg border border-border p-6 text-center">
        <p className="font-semibold">Elegí un outfit primero</p>
        <p className="mt-2 text-sm text-muted-foreground">
          El probador trabaja sobre una combinación armada en la sección de outfits.
        </p>
        <Button type="button" className="mt-4" onClick={() => router.push('/outfits')}>
          Ver outfits
        </Button>
      </div>
    );
  }

  if (outfit.isLoading) {
    return <Skeleton className="h-48 w-full rounded-lg" />;
  }

  if (outfit.isError || !outfit.data) {
    return (
      <div className="rounded-lg border border-border p-6 text-center">
        <p className="font-semibold">No encontramos ese outfit</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Puede que la recomendación ya no esté disponible.
        </p>
        <Button type="button" className="mt-4" onClick={() => router.push('/outfits')}>
          Ver outfits
        </Button>
      </div>
    );
  }

  const images = new Map(
    (capsule.data?.garments ?? []).map(g => [g.id, g.processed_image_url] as const)
  );

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Outfit elegido */}
      <Card className="rounded-2xl sm:rounded-3xl border border-border/80 bg-background/80 shadow-xs">
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Outfit a probar</h2>
            {availableOutfits.length > 1 && (
              <p className="text-xs text-muted-foreground mt-0.5">
                {availableOutfits.length} combinaciones disponibles
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className="border-accent/40 text-accent font-mono text-xs capitalize"
            >
              {outfit.data.aesthetic.replace(/_/g, ' ')}
            </Badge>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
              onClick={() => router.push('/outfits')}
            >
              Cambiar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <ul className="grid grid-cols-4 gap-2" aria-label="Prendas del outfit">
            {outfit.data.garments.map(ref => {
              const src = images.get(ref.garment_id);
              return (
                <li
                  key={ref.garment_id}
                  className="relative aspect-square overflow-hidden rounded-xl bg-muted/60 border border-border/50"
                >
                  {src ? (
                    // eslint-disable-next-line @next/next/no-img-element -- URL arbitraria del backend
                    <img
                      src={src}
                      alt={POSITION_LABEL[ref.position]}
                      className="h-full w-full object-cover"
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
        </CardContent>
      </Card>

      {/* Foto + generación */}
      <Card className="rounded-2xl sm:rounded-3xl border border-border/80 bg-background/80 shadow-xs">
        <CardHeader>
          <h2 className="text-lg font-semibold tracking-tight">Tu foto</h2>
        </CardHeader>
        <CardContent className="space-y-4">
          <PhotoConsentGate>
            <div className="space-y-4">
              {previewUrl ? (
                <div className="space-y-3">
                  <div className="relative aspect-[3/4] w-full overflow-hidden rounded-lg bg-muted">
                    {/* eslint-disable-next-line @next/next/no-img-element -- object URL local */}
                    <img
                      src={previewUrl}
                      alt="Foto seleccionada para la prueba virtual"
                      className="h-full w-full object-contain"
                    />
                  </div>
                  <Button type="button" variant="secondary" size="sm" onClick={resetPhoto}>
                    Cambiar foto
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <GarmentDropzone onFilesSelected={handleFiles} multiple={false} />
                  <div className="rounded-lg border border-border/80 bg-muted/30 p-3 space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">
                      O usá un modelo rápido para la demo:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        className="text-xs h-8"
                        onClick={() =>
                          void loadSample('/samples/usuario_canonico.jpg', 'usuario_canonico.jpg')
                        }
                      >
                        ✓ Modelo A-Pose (Canónico)
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        className="text-xs h-8 text-amber-600 dark:text-amber-400"
                        onClick={() =>
                          void loadSample('/samples/usuario_apose.jpg', 'usuario_apose.jpg')
                        }
                      >
                        ⚠ Probar rechazo A-Pose
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              <Button
                type="button"
                className="w-full"
                onClick={submit}
                disabled={!file || createJob.isPending || phase === 'processing'}
              >
                {createJob.isPending
                  ? 'Generando…'
                  : phase === 'processing'
                    ? 'Procesando en el probador…'
                    : 'Generar prueba virtual'}
              </Button>
              {createError && (
                <div className="space-y-2.5">
                  {createError.toLowerCase().includes('pose') ||
                  createError.toLowerCase().includes('codo') ? (
                    <div className="space-y-2 rounded-xl border border-destructive/40 bg-destructive/10 p-3.5 text-left">
                      <div className="flex items-center gap-2 text-xs font-semibold text-destructive">
                        <ShieldAlert className="h-4 w-4 shrink-0" />
                        <span>Alerta Biomecánica: Postura No Canónica</span>
                      </div>
                      <p className="font-mono text-xs text-destructive/90">{createError}</p>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        MediaPipe exige una postura frontal A-Pose para proteger el cómputo de GPU y
                        evitar distorsiones en la prenda.
                      </p>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        className="w-full text-xs font-medium h-8"
                        onClick={() =>
                          void loadSample('/samples/usuario_canonico.jpg', 'usuario_canonico.jpg')
                        }
                      >
                        ✓ Cambiar a Modelo A-Pose Canónico
                      </Button>
                    </div>
                  ) : null}
                  <p role="alert" className="text-sm text-destructive">
                    {createError}
                  </p>
                </div>
              )}
            </div>
          </PhotoConsentGate>

          {phase === 'processing' && (
            <div className="space-y-3.5 rounded-2xl border border-accent/30 bg-accent/5 p-4 text-center">
              <div className="flex items-center justify-between text-xs font-mono text-muted-foreground">
                <span className="flex items-center gap-1.5 font-semibold text-accent">
                  <RefreshCw className="h-3.5 w-3.5 animate-spin motion-reduce:animate-none" />{' '}
                  Inferencia asíncrona
                </span>
                <span>{elapsedSec}s transcurridos</span>
              </div>

              {/* Pipeline Tracker */}
              <div className="space-y-2 text-left text-xs">
                <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-background/90 p-2.5 shadow-2xs">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                  <div className="flex-1">
                    <p className="font-medium text-foreground">
                      1. Validación anatómica (MediaPipe A-Pose)
                    </p>
                    <p className="text-[11px] text-muted-foreground">Postura correcta verificada</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-background/90 p-2.5 shadow-2xs">
                  <RefreshCw className="h-4 w-4 shrink-0 animate-spin motion-reduce:animate-none text-accent" />
                  <div className="flex-1">
                    <p className="font-medium text-foreground">
                      2. Segmentación & SCHP Human Parsing
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      Alineación de prendas y silueta
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 rounded-xl border border-border/40 bg-muted/40 p-2.5 opacity-70">
                  <Layers className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="font-medium text-muted-foreground">
                      3. Difusión multicapa (CatVTON)
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      Renderizado y mezcla por capas
                    </p>
                  </div>
                </div>
              </div>

              <Skeleton className="mx-auto h-2 w-full rounded-full" />
              <p className="text-sm text-muted-foreground" role="status">
                La IA está vistiendo tu outfit… ({Math.round(POLL_TIMEOUT_MS / 1000)}s máx.)
              </p>
            </div>
          )}

          {phase === 'timeout' && (
            <div className="space-y-3 rounded-lg border border-border p-4 text-center">
              <p className="font-semibold">Está tardando más de lo normal</p>
              <p className="text-sm text-muted-foreground">
                El job sigue procesándose en el servidor — podemos seguir esperando.
              </p>
              <Button type="button" variant="secondary" size="sm" onClick={resumePolling}>
                Seguir esperando
              </Button>
            </div>
          )}

          {phase === 'completed' && resultUrl && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {previewUrl && (
                  <div className="space-y-1.5">
                    <p className="text-xs font-medium text-muted-foreground">Foto original</p>
                    {/* eslint-disable-next-line @next/next/no-img-element -- blob preview URL */}
                    <img
                      src={previewUrl}
                      alt="Foto original del usuario para prueba virtual"
                      className="aspect-3/4 w-full rounded-xl border border-border object-cover"
                    />
                  </div>
                )}
                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-muted-foreground">Resultado con outfit</p>
                  {/* eslint-disable-next-line @next/next/no-img-element -- URL arbitraria del backend */}
                  <img
                    src={resultUrl}
                    alt={
                      outfit.data?.aesthetic
                        ? `Resultado de la prueba virtual con el outfit estética ${outfit.data.aesthetic.replace(/_/g, ' ')}`
                        : 'Resultado de la prueba virtual con el outfit aplicado'
                    }
                    className="aspect-3/4 w-full rounded-xl border border-border object-cover"
                  />
                </div>
              </div>
              <div className="flex flex-wrap gap-2 pt-2">
                <Button type="button" size="sm" asChild>
                  <a href={resultUrl} download>
                    Guardar imagen
                  </a>
                </Button>
                <Button type="button" variant="secondary" size="sm" onClick={resetPhoto}>
                  Probar con otra foto
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => router.push('/outfits')}
                >
                  Probar otro outfit
                </Button>
              </div>
            </div>
          )}

          {phase === 'failed' && (
            <div className="space-y-3 rounded-lg border border-destructive/40 p-4">
              <p role="alert" className="font-semibold text-destructive">
                {failure}
              </p>
              <div className="flex gap-2">
                <Button type="button" variant="secondary" size="sm" onClick={resetPhoto}>
                  Probar con otra foto
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => router.push('/outfits')}
                >
                  Cambiar outfit
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
