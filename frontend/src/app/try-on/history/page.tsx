import { Suspense, type JSX } from 'react';
import Link from 'next/link';
import { VtonHistoryView } from '@/features/vton/components/VtonHistoryView';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BentoCard } from '@/components/ui/card';
import { ArrowLeft, History, Sparkles } from 'lucide-react';

export default function VtonHistoryPage(): JSX.Element {
  return (
    <div className="min-h-full h-full pb-20 pt-4 px-4 sm:px-6 lg:px-8 max-w-[1440px] mx-auto space-y-6 sm:space-y-8">
      {/* Bento Header */}
      <section
        aria-label="Cabecera del Historial"
        className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch"
      >
        <BentoCard className="lg:col-span-12 p-6 sm:p-8 rounded-3xl justify-between border-border/80 bg-background/85 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Button
                  asChild
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs px-2 -ml-2 text-muted-foreground hover:text-foreground"
                >
                  <Link href="/try-on">
                    <ArrowLeft className="mr-1 h-3.5 w-3.5" />
                    Volver al probador
                  </Link>
                </Button>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge
                  variant="outline"
                  className="rounded-full border-border/80 bg-muted/50 px-3 py-0.5 text-xs font-medium text-foreground"
                >
                  Historial
                </Badge>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/10 px-2.5 py-0.5 text-[11px] font-medium text-accent border border-accent/20">
                  <History className="h-3 w-3" />
                  Pruebas registradas
                </span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
                Historial de pruebas
              </h1>
              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed max-w-2xl text-pretty">
                Tus pruebas virtuales anteriores guardadas en tu cuenta para descargar o comparar
                resultados.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Button asChild size="sm" className="rounded-full text-xs h-9">
                <Link href="/try-on">
                  <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                  Nueva prueba virtual
                </Link>
              </Button>
            </div>
          </div>
        </BentoCard>
      </section>

      {/* Grid del Historial */}
      <section aria-label="Lista de pruebas virtuales anteriores">
        <Suspense fallback={<Skeleton />}>
          <VtonHistoryView />
        </Suspense>
      </section>
    </div>
  );
}

function Skeleton(): JSX.Element {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {[1, 2, 3].map(i => (
        <div key={i} className="h-80 w-full animate-pulse rounded-3xl bg-muted/40" />
      ))}
    </div>
  );
}
