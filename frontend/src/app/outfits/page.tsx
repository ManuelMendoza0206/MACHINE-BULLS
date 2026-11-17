import { Suspense, type JSX } from 'react';
import { OutfitsView } from '@/features/outfits/components/OutfitsView';
import { Badge } from '@/components/ui/badge';
import { BentoCard } from '@/components/ui/card';
import { Sparkles, Palette } from 'lucide-react';

/**
 * `useSearchParams` en `OutfitsView` exige un Suspense boundary para el prerender de `next build`.
 */
export default function OutfitsPage(): JSX.Element {
  return (
    <div className="min-h-full h-full pb-20 pt-4 px-4 sm:px-6 lg:px-8 max-w-[1440px] mx-auto space-y-6 sm:space-y-8">
      {/* Bento Header */}
      <section
        aria-label="Cabecera de Outfits"
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
                  Ideas para vestir
                </Badge>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/10 px-2.5 py-0.5 text-[11px] font-medium text-accent border border-accent/20">
                  <Palette className="h-3 w-3" />
                  Combinación inteligente
                </span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
                Tus conjuntos
              </h1>
              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed max-w-2xl text-pretty">
                Conjuntos pensados para que tus prendas combinen con estilo, listos para probar
                sobre tu silueta.
              </p>
            </div>

            <div className="hidden md:flex flex-col gap-1.5 rounded-2xl border border-border/60 bg-muted/30 p-3.5 text-xs">
              <span className="font-semibold text-foreground flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-accent" />
                Cómo armamos tus conjuntos:
              </span>
              <span className="text-muted-foreground">• Armonía en la combinación de colores</span>
              <span className="text-muted-foreground">• Estilo acorde a la ocasión y tu día</span>
            </div>
          </div>
        </BentoCard>
      </section>

      {/* Grid de Outfits Recomendados */}
      <section aria-label="Combinaciones recomendadas">
        <Suspense fallback={<OutfitsSkeleton />}>
          <OutfitsView />
        </Suspense>
      </section>
    </div>
  );
}

function OutfitsSkeleton(): JSX.Element {
  return (
    <div className="space-y-6">
      <div className="h-14 w-full animate-pulse rounded-2xl bg-muted/40" />
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 h-96 animate-pulse rounded-3xl bg-muted/40" />
        <div className="lg:col-span-5 h-96 animate-pulse rounded-3xl bg-muted/40" />
      </div>
    </div>
  );
}
