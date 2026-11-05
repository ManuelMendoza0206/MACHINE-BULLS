import type { JSX } from 'react';
import Link from 'next/link';
import { CapsuleCatalogGrid } from '@/features/garments/components/CapsuleCatalogGrid';
import { BentoCard } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Sparkles } from 'lucide-react';

export default function WardrobeCapsulePage(): JSX.Element {
  return (
    <div className="min-h-full h-full pb-20 pt-4 px-4 sm:px-6 lg:px-8 max-w-[1440px] mx-auto space-y-6 sm:space-y-8">
      {/* Bento Header */}
      <section
        aria-label="Cabecera Catálogo Cápsula"
        className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch"
      >
        <BentoCard className="lg:col-span-12 p-6 sm:p-8 rounded-3xl justify-between border-border/80 bg-background/85 shadow-sm">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Button
                asChild
                variant="ghost"
                size="sm"
                className="h-7 text-xs px-2 -ml-2 text-muted-foreground hover:text-foreground"
              >
                <Link href="/wardrobe">
                  <ArrowLeft className="mr-1 h-3.5 w-3.5" />
                  Volver al armario
                </Link>
              </Button>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant="outline"
                className="rounded-full border-border/80 bg-muted/50 px-3 py-0.5 text-xs font-medium text-foreground"
              >
                Colección básica
              </Badge>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/10 px-2.5 py-0.5 text-[11px] font-medium text-accent border border-accent/20">
                <Sparkles className="h-3 w-3" />
                Colorimetría calibrada
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
              Catálogo cápsula
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed max-w-2xl text-pretty">
              Elige prendas de nuestros básicos para empezar tu armario o completar combinaciones
              antes de hacer la prueba virtual.
            </p>
          </div>
        </BentoCard>
      </section>

      {/* Grid del Catálogo */}
      <section aria-label="Catálogo de prendas">
        <CapsuleCatalogGrid />
      </section>
    </div>
  );
}
