import { Suspense, type JSX } from 'react';
import Link from 'next/link';
import { TryOnView } from '@/features/vton/components/TryOnView';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BentoCard } from '@/components/ui/card';
import { History, Sparkles } from 'lucide-react';

/**
 * `useSearchParams` exige un Suspense boundary para el prerender de `next build`.
 */
export default function ProbadorPage(): JSX.Element {
  return (
    <div className="min-h-full h-full pb-20 pt-4 px-4 sm:px-6 lg:px-8 max-w-[1440px] mx-auto space-y-6 sm:space-y-8">
      {/* Bento Header */}
      <section
        aria-label="Cabecera del Probador"
        className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch"
      >
        <BentoCard className="lg:col-span-12 p-6 sm:p-8 rounded-3xl justify-between border-border/80 bg-background/85 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <Badge
                  variant="outline"
                  className="rounded-full border-border/80 bg-muted/50 px-3 py-0.5 text-xs font-medium text-foreground"
                >
                  Probador virtual
                </Badge>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/10 px-2.5 py-0.5 text-[11px] font-medium text-accent border border-accent/20">
                  <Sparkles className="h-3 w-3" />
                  CatVTON asíncrono
                </span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
                Probador
              </h1>
              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed max-w-2xl text-pretty">
                Sube una foto tuya para probar el outfit elegido sobre tu silueta respetando el
                orden por capas.
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <Button asChild variant="outline" size="sm" className="rounded-full h-10 px-4">
                <Link href="/try-on/history">
                  <History className="mr-2 h-4 w-4" />
                  Historial de pruebas
                </Link>
              </Button>
            </div>
          </div>
        </BentoCard>
      </section>

      {/* Espacio de Trabajo del Probador */}
      <section aria-label="Espacio de trabajo del probador">
        <Suspense fallback={<Skeleton />}>
          <TryOnView />
        </Suspense>
      </section>
    </div>
  );
}

function Skeleton(): JSX.Element {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="h-96 w-full animate-pulse rounded-3xl bg-muted/40" />
      <div className="h-96 w-full animate-pulse rounded-3xl bg-muted/40" />
    </div>
  );
}
