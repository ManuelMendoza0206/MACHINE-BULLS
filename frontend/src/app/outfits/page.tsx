import type { JSX } from 'react';
import { OutfitsView } from '@/features/outfits/components/OutfitsView';
import { Badge } from '@/components/ui/badge';
import { BentoCard } from '@/components/ui/card';
import { Sparkles, Palette } from 'lucide-react';

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
                  Recomendador de armario
                </Badge>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/10 px-2.5 py-0.5 text-[11px] font-medium text-accent border border-accent/20">
                  <Palette className="h-3 w-3" />
                  Armonía HSV + CLIP
                </span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
                Outfits
              </h1>
              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed max-w-2xl text-pretty">
                Combinaciones armadas por armonía cromática y compatibilidad de estilo, listas para
                probar sobre tu silueta.
              </p>
            </div>

            <div className="hidden md:flex flex-col gap-1.5 rounded-2xl border border-border/60 bg-muted/30 p-3.5 text-xs">
              <span className="font-semibold text-foreground flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-accent" />
                Criterios de combinación:
              </span>
              <span className="text-muted-foreground">
                • Círculo cromático (análogos/complementarios)
              </span>
              <span className="text-muted-foreground">
                • Afinidad estética (casual, formal, minimalista)
              </span>
            </div>
          </div>
        </BentoCard>
      </section>

      {/* Grid de Outfits Recomendados */}
      <section aria-label="Combinaciones recomendadas">
        <OutfitsView />
      </section>
    </div>
  );
}
