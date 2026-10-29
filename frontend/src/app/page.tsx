import type { JSX } from 'react';
import Link from 'next/link';
import { Palette, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { BentoCard } from '@/components/ui/card';
import { LandingCta } from '@/features/auth/components/LandingCta';

export default function Home(): JSX.Element {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      {/* Hero Principal */}
      <section className="hero-glow relative overflow-hidden border-b border-border px-4 py-14 sm:py-24 text-center sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl space-y-6">
          <div className="animate-enter flex justify-center">
            <Badge
              variant="outline"
              className="border-accent/30 bg-accent/5 text-accent px-3.5 py-1 text-xs uppercase tracking-widest font-mono"
            >
              StyleSync IA · Virtual Try-On Multicapa
            </Badge>
          </div>

          <h1
            className="animate-enter text-3xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl text-balance"
            style={{ animationDelay: '80ms' }}
          >
            Tu guardarropa inteligente y probador virtual con{' '}
            <span className="text-accent underline decoration-accent/60 underline-offset-8">
              IA generativa
            </span>
          </h1>

          <p
            className="animate-enter mx-auto max-w-2xl text-base sm:text-lg text-muted-foreground text-balance leading-relaxed"
            style={{ animationDelay: '160ms' }}
          >
            Digitalizá tus prendas con visión artificial, descubrí combinaciones armónicas basadas
            en teoría del color y probate tus outfits sobre tu propia foto en segundos.
          </p>

          <div
            className="animate-enter flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 sm:gap-4 pt-4 max-w-md mx-auto sm:max-w-none"
            style={{ animationDelay: '240ms' }}
          >
            <LandingCta />
            <Link
              href="/try-on"
              className="inline-flex min-h-11 items-center justify-center rounded-md border border-border bg-background px-6 py-3 font-medium text-foreground transition-all hover:bg-muted active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              Probar en el vestidor →
            </Link>
          </div>
        </div>

        {/* Bento Grid Modular Showcase */}
        <div className="mx-auto mt-12 sm:mt-16 max-w-6xl">
          <div className="stagger grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 sm:gap-6 text-left">
            {/* Bento 1: Héroe VTON Multicapa (Span 2 cols x 2 rows en desktop) */}
            <BentoCard
              glow
              className="lg:col-span-2 lg:row-span-2 min-h-[380px] sm:min-h-[440px] justify-between p-0 overflow-hidden"
            >
              <div className="relative aspect-[4/3] sm:aspect-[16/10] lg:aspect-auto lg:h-[280px] w-full bg-muted/30 overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/samples/usuario_canonico.jpg"
                  alt="Modelo en probador virtual VTON"
                  className="h-full w-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent" />
                <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                  <span className="rounded-full bg-accent px-3 py-1 text-xs font-semibold text-accent-foreground shadow-xs">
                    VTON Multicapa
                  </span>
                  <span className="rounded-full bg-background/90 px-2.5 py-1 text-xs font-mono text-muted-foreground backdrop-blur-md">
                    MediaPipe A-Pose
                  </span>
                </div>
                <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-xs font-mono text-foreground/90 backdrop-blur-md bg-background/80 px-3 py-1.5 rounded-lg border border-border/50">
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    Fotomontaje sobre silueta
                  </span>
                  <span className="text-accent font-semibold">&lt; 50 ms</span>
                </div>
              </div>
              <div className="p-5 sm:p-6 space-y-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-accent" />
                  <h2 className="font-semibold text-lg sm:text-xl tracking-tight">
                    1. Probador Virtual Multicapa
                  </h2>
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  Superpone prendas directamente sobre tu postura corporal con detección
                  tridimensional de landmarks anatómicos y procesamiento asíncrono.
                </p>
              </div>
            </BentoCard>

            {/* Bento 2: Recomendador Cromático Itten (Span 2 cols en desktop) */}
            <BentoCard className="lg:col-span-2 min-h-[220px] justify-between">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Palette className="h-4 w-4 text-accent" />
                    <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
                      Teoría del Color de Itten
                    </span>
                  </div>
                  <h3 className="font-semibold text-base sm:text-lg tracking-tight">
                    2. Armonía Cromática HSV
                  </h3>
                </div>
                <Badge
                  variant="outline"
                  className="border-accent/40 bg-accent/10 text-accent font-mono text-xs"
                >
                  94% Score
                </Badge>
              </div>

              <div className="my-3 flex items-center gap-3 rounded-xl bg-muted/40 p-3 border border-border/60">
                <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-muted">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/samples/prenda_pantalon.jpg"
                    alt="Prenda analizada cromáticamente"
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="flex-1 space-y-1 text-xs">
                  <div className="flex justify-between font-medium">
                    <span className="text-muted-foreground">Contraste cromático</span>
                    <span className="text-accent font-semibold">Análogo Armónico</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div className="h-full bg-accent rounded-full w-[94%]" />
                  </div>
                </div>
              </div>

              <p className="text-xs text-muted-foreground leading-relaxed">
                Empareja prendas de tu armario evaluando contrastes de luminosidad y afinidades
                armónicas sin sesgos humanos.
              </p>
            </BentoCard>

            {/* Bento 3: Visión Artificial CLIP (Span 1 col) */}
            <BentoCard className="lg:col-span-1 min-h-[200px] justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
                    Visión
                  </span>
                  <span className="rounded bg-background/90 px-1.5 py-0.5 text-[10px] font-mono text-emerald-500 border border-emerald-500/20">
                    CPU Ready
                  </span>
                </div>
                <div className="relative aspect-[16/10] w-full overflow-hidden rounded-lg bg-muted mb-2.5">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/samples/prenda_chaqueta.jpg"
                    alt="Chaqueta clasificada por CLIP"
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  <span className="absolute bottom-1.5 left-1.5 rounded bg-background/90 px-1.5 py-0.5 text-[10px] font-semibold backdrop-blur">
                    Outerwear
                  </span>
                </div>
                <h4 className="font-semibold text-sm">3. CLIP ViT-B/32</h4>
              </div>
              <p className="text-[11px] text-muted-foreground pt-1">
                Extracción instantánea de 512 embeddings de corte, textura y tipo.
              </p>
            </BentoCard>

            {/* Bento 4: Detección y Armario Cápsula (Span 1 col) */}
            <BentoCard className="lg:col-span-1 min-h-[200px] justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
                    Digitalización
                  </span>
                  <span className="rounded bg-accent/10 px-1.5 py-0.5 text-[10px] font-mono text-accent">
                    Catálogo
                  </span>
                </div>
                <div className="relative aspect-[16/10] w-full overflow-hidden rounded-lg bg-muted mb-2.5">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/samples/prenda_camiseta.jpg"
                    alt="Camiseta lista para el probador"
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  <span className="absolute bottom-1.5 left-1.5 rounded bg-background/90 px-1.5 py-0.5 text-[10px] font-semibold backdrop-blur">
                    Top Básico
                  </span>
                </div>
                <h4 className="font-semibold text-sm">4. Armario Cápsula</h4>
              </div>
              <p className="text-[11px] text-muted-foreground pt-1">
                Prendas precargadas y listas para combinar en cualquier silueta.
              </p>
            </BentoCard>
          </div>
        </div>
      </section>

      {/* Bento Grid de Métricas de Precisión */}
      <section className="border-b border-border bg-muted/20 px-4 py-12 sm:px-6">
        <div className="mx-auto max-w-6xl grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <BentoCard className="p-4 sm:p-5 text-center items-center justify-center">
            <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-accent">
              512 D
            </div>
            <p className="mt-1 text-xs text-muted-foreground uppercase font-mono tracking-wider">
              Embeddings CLIP
            </p>
          </BentoCard>
          <BentoCard className="p-4 sm:p-5 text-center items-center justify-center">
            <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-accent">
              3 Capas
            </div>
            <p className="mt-1 text-xs text-muted-foreground uppercase font-mono tracking-wider">
              Multilayer VTON
            </p>
          </BentoCard>
          <BentoCard className="p-4 sm:p-5 text-center items-center justify-center">
            <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-accent">
              &lt; 50 ms
            </div>
            <p className="mt-1 text-xs text-muted-foreground uppercase font-mono tracking-wider">
              Validación A-Pose
            </p>
          </BentoCard>
          <BentoCard className="p-4 sm:p-5 text-center items-center justify-center">
            <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-accent">
              94%+
            </div>
            <p className="mt-1 text-xs text-muted-foreground uppercase font-mono tracking-wider">
              Armonía de Itten
            </p>
          </BentoCard>
        </div>
      </section>

      {/* Llamado a la Acción Modular Bento */}
      <section className="px-4 py-14 sm:py-20 text-center sm:px-6">
        <div className="mx-auto max-w-3xl">
          <BentoCard glow className="p-8 sm:p-12 text-center space-y-5 items-center">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-accent/10 text-accent">
              <Sparkles className="h-5 w-5" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl sm:text-4xl font-bold tracking-tight">
                Explorá tu guardarropa inteligente
              </h2>
              <p className="mx-auto max-w-xl text-sm sm:text-base text-muted-foreground text-balance">
                Digitalizá nuevas prendas con arrastre táctil o probá combinaciones automáticas con
                el catálogo cápsula precargado.
              </p>
            </div>
            <div className="pt-3 flex flex-col sm:flex-row justify-center gap-3 sm:gap-4 w-full sm:w-auto">
              <Link
                href="/wardrobe"
                className="inline-flex min-h-12 items-center justify-center rounded-xl bg-accent px-6 py-3 text-sm font-medium text-accent-foreground shadow-xs transition-all hover:bg-accent/90 active:scale-[0.98]"
              >
                Ir al Armario Cápsula
              </Link>
              <Link
                href="/outfits"
                className="inline-flex min-h-12 items-center justify-center rounded-xl border border-border bg-background px-6 py-3 text-sm font-medium transition-all hover:bg-muted active:scale-[0.98]"
              >
                Ver Outfits Recomendados
              </Link>
            </div>
          </BentoCard>
        </div>
      </section>
    </div>
  );
}
