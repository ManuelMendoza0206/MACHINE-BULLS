'use client';

import { type JSX } from 'react';
import Link from 'next/link';
import { useVtonJobsHistory } from '@/features/vton/hooks/useVtonJobsHistory';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { describeGarmentError } from '@/features/garments/lib/describeGarmentError';
import {
  Sparkles,
  Calendar,
  ExternalLink,
  AlertCircle,
  Clock,
  ArrowRight,
  Shirt,
} from 'lucide-react';

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('es-AR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

/**
 * Vista de historial de pruebas virtuales (/try-on/history, spec 04 §3.4).
 */
export function VtonHistoryView(): JSX.Element {
  const query = useVtonJobsHistory(50);

  if (query.isPending) {
    return (
      <div className="space-y-6" aria-busy="true">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={`vton-history-skel-${i}`} className="aspect-[3/4] w-full rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  if (query.isError) {
    return (
      <Card className="border-destructive/30 bg-destructive/5">
        <CardContent className="space-y-3 p-6 text-sm">
          <div className="flex items-center gap-2 text-destructive font-medium">
            <AlertCircle className="h-5 w-5" />
            <span>No pudimos cargar el historial de pruebas</span>
          </div>
          <p className="text-muted-foreground">{describeGarmentError(query.error)}</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void query.refetch()}
            className="mt-2"
          >
            Reintentar
          </Button>
        </CardContent>
      </Card>
    );
  }

  const jobs = query.data?.jobs ?? [];

  if (jobs.length === 0) {
    return (
      <Card className="border-dashed border-2 bg-muted/20">
        <CardContent className="flex flex-col items-center justify-center p-12 text-center space-y-4">
          <div className="rounded-full bg-accent/15 p-4 text-accent">
            <Sparkles className="h-8 w-8" />
          </div>
          <div className="space-y-1">
            <h2 className="text-xl font-semibold tracking-tight">
              Aún no realizaste ninguna prueba virtual
            </h2>
            <p className="max-w-md text-sm text-muted-foreground">
              Seleccioná un outfit sugerido por la IA o armá el tuyo y subí una foto para ver cómo
              te queda puesto.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Button asChild>
              <Link href="/try-on">
                Ir al probador <ArrowRight className="ml-1.5 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/outfits">Ver Outfits recomendados</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {jobs.length} prueba{jobs.length === 1 ? '' : 's'} registrada
          {jobs.length === 1 ? '' : 's'}
        </p>
        <Button asChild size="sm" variant="outline">
          <Link href="/try-on">
            <Sparkles className="mr-1.5 h-4 w-4 text-accent" />
            Nueva prueba virtual
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {jobs.map(job => {
          const isCompleted = job.status === 'completed';
          const isProcessing = job.status === 'processing' || job.status === 'pending';

          return (
            <Card
              key={job.job_id}
              className="group overflow-hidden rounded-2xl border border-border/80 bg-background/80 shadow-xs transition-all hover:shadow-md"
            >
              <div className="relative aspect-[3/4] w-full overflow-hidden bg-muted/40">
                {isCompleted && job.result_url ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={job.result_url}
                      alt={`Prueba virtual generada el ${formatDate(job.created_at)}`}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-102"
                      loading="lazy"
                    />
                    <a
                      href={job.result_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="absolute bottom-3 right-3 rounded-full bg-background/80 p-2 text-foreground backdrop-blur-md opacity-0 shadow-md transition-opacity group-hover:opacity-100"
                      aria-label="Abrir imagen completa"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </>
                ) : isProcessing ? (
                  <div className="flex h-full w-full flex-col items-center justify-center p-6 text-center space-y-3">
                    <Clock className="h-8 w-8 animate-spin text-muted-foreground" />
                    <p className="text-xs font-medium text-muted-foreground">
                      Procesando en segundo plano...
                    </p>
                  </div>
                ) : (
                  <div className="flex h-full w-full flex-col items-center justify-center p-6 text-center space-y-3">
                    <AlertCircle className="h-8 w-8 text-destructive/80" />
                    <p className="text-xs text-muted-foreground">
                      {job.error_message ?? 'La prueba no pudo completarse.'}
                    </p>
                  </div>
                )}

                <div className="absolute top-3 left-3">
                  {isCompleted ? (
                    <Badge variant="success" className="shadow-xs backdrop-blur-md">
                      Completado
                    </Badge>
                  ) : isProcessing ? (
                    <Badge variant="warning" className="shadow-xs backdrop-blur-md">
                      En proceso
                    </Badge>
                  ) : (
                    <Badge variant="destructive" className="shadow-xs backdrop-blur-md">
                      Falló
                    </Badge>
                  )}
                </div>
              </div>

              <CardHeader className="p-4 pb-2">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5 shrink-0" />
                  <span>{formatDate(job.created_at)}</span>
                </div>
              </CardHeader>

              <CardContent className="p-4 pt-1">
                {job.outfit_id ? (
                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/50">
                    <Button
                      asChild
                      variant="ghost"
                      size="sm"
                      className="h-8 text-xs px-2 text-muted-foreground hover:text-foreground"
                    >
                      <Link href={`/outfits?outfit=${job.outfit_id}`}>
                        <Shirt className="mr-1.5 h-3.5 w-3.5" />
                        Ver outfit
                      </Link>
                    </Button>
                    <Button asChild size="sm" variant="secondary" className="h-8 text-xs px-2.5">
                      <Link href={`/try-on?outfit=${job.outfit_id}`}>Probar de nuevo</Link>
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center justify-end pt-2 border-t border-border/50">
                    <Button asChild size="sm" variant="secondary" className="h-8 text-xs">
                      <Link href="/try-on">Nueva prueba</Link>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
