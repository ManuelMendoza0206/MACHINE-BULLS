import type { JSX } from 'react';
import { WardrobeView } from '@/features/garments/components/WardrobeView';
import { WardrobeAnalyticsCard } from '@/features/shopping/components/WardrobeAnalyticsCard';
import { Badge } from '@/components/ui/badge';
import { BentoCard } from '@/components/ui/card';
import { Sparkles, Layers, ShieldCheck } from 'lucide-react';

export default function WardrobePage(): JSX.Element {
  return (
    <div className="min-h-full h-full pb-20 pt-4 px-4 sm:px-6 lg:px-8 max-w-[1440px] mx-auto space-y-6 sm:space-y-8">
      {/* Bento Header: Alineación horizontal y vertical completa */}
      <section
        aria-label="Cabecera del Armario"
        className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch"
      >
        <BentoCard className="lg:col-span-7 p-6 sm:p-8 rounded-3xl justify-between border-border/80 bg-background/85 shadow-sm">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant="outline"
                className="rounded-full border-border/80 bg-muted/50 px-3 py-0.5 text-xs font-medium text-foreground"
              >
                Tu guardarropa
              </Badge>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/10 px-2.5 py-0.5 text-[11px] font-medium text-accent border border-accent/20">
                <Sparkles className="h-3 w-3" />
                Identificación de colores
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
              Tu armario
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed max-w-2xl text-pretty">
              Sube fotos de tus prendas o elige del catálogo cápsula para empezar a armar
              combinaciones y probarlas en tu silueta.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-y-2 gap-x-5 pt-4 mt-2 border-t border-border/60 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <Layers className="h-3.5 w-3.5 text-accent" />
              Fondo eliminado automáticamente
            </span>
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-accent" />
              Tus fotos están protegidas
            </span>
          </div>
        </BentoCard>

        {/* Bento Inteligencia y Salud del Armario */}
        <div className="lg:col-span-5 h-full">
          <WardrobeAnalyticsCard />
        </div>
      </section>

      {/* Espacio de Trabajo Principal del Armario */}
      <section aria-label="Contenido del armario">
        <WardrobeView />
      </section>
    </div>
  );
}
