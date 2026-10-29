import type { JSX } from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { LandingCta } from '@/features/auth/components/LandingCta';

export default function Home(): JSX.Element {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      {/* Hero Principal */}
      <section className="relative overflow-hidden border-b border-border px-6 py-20 text-center sm:py-28 lg:px-8">
        <div className="mx-auto max-w-4xl space-y-6">
          <div className="flex justify-center">
            <Badge
              variant="outline"
              className="px-3 py-1 text-xs uppercase tracking-widest font-mono"
            >
              StyleSync IA · Virtual Try-On Multicapa
            </Badge>
          </div>

          <h1 className="text-4xl font-extrabold tracking-tight sm:text-6xl text-balance">
            Tu guardarropa inteligente y probador virtual con{' '}
            <span className="underline decoration-accent underline-offset-8">IA generativa</span>
          </h1>

          <p className="mx-auto max-w-2xl text-lg text-muted-foreground text-balance">
            Digitalizá tus prendas con visión artificial, descubrí combinaciones armónicas basadas
            en teoría del color y probate tus outfits sobre tu propia foto en segundos.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
            <LandingCta />
            <Link
              href="/try-on"
              className="inline-flex min-h-11 items-center justify-center rounded-md border border-border bg-background px-6 py-3 font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              Probar en el vestidor →
            </Link>
          </div>
        </div>

        {/* Mosaico Visual de Demostración */}
        <div className="mx-auto mt-16 max-w-5xl">
          <div className="grid gap-6 text-left sm:grid-cols-3">
            {/* Tarjeta 1: Visión Artificial */}
            <Card className="overflow-hidden border border-border/80 bg-card/60 backdrop-blur transition-all hover:shadow-lg">
              <div className="relative aspect-[4/3] bg-muted/50 overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/samples/prenda_chaqueta.jpg"
                  alt="Chaqueta analizada por CLIP"
                  className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
                />
                <div className="absolute bottom-2 left-2 flex gap-1.5">
                  <span className="rounded bg-background/90 px-2 py-0.5 text-xs font-semibold backdrop-blur">
                    Outerwear
                  </span>
                  <span className="rounded bg-background/90 px-2 py-0.5 text-xs font-mono text-muted-foreground backdrop-blur">
                    CLIP ViT-B/32
                  </span>
                </div>
              </div>
              <CardContent className="p-5 space-y-2">
                <h2 className="font-semibold text-base">1. Análisis de Visión</h2>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Subí cualquier prenda y la IA clasifica categoría, estilo y paleta de color
                  dominante en milisegundos.
                </p>
                <div className="pt-2 flex items-center gap-1.5 text-xs text-muted-foreground font-mono">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 inline-block"></span>
                  Inferencia local en CPU
                </div>
              </CardContent>
            </Card>

            {/* Tarjeta 2: Teoría del Color */}
            <Card className="overflow-hidden border border-border/80 bg-card/60 backdrop-blur transition-all hover:shadow-lg">
              <div className="relative aspect-[4/3] bg-muted/50 overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/samples/prenda_pantalon.jpg"
                  alt="Pantalón combinado cromáticamente"
                  className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
                />
                <div className="absolute bottom-2 left-2 flex gap-1.5">
                  <span className="rounded bg-background/90 px-2 py-0.5 text-xs font-semibold backdrop-blur">
                    94% Armonía
                  </span>
                  <span className="rounded bg-background/90 px-2 py-0.5 text-xs font-mono text-muted-foreground backdrop-blur">
                    Análogo HSV
                  </span>
                </div>
              </div>
              <CardContent className="p-5 space-y-2">
                <h2 className="font-semibold text-base">2. Recomendador Cromático</h2>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Arma combinaciones de prendas evaluando contrastes de luminosidad y afinidad
                  cromática sin sesgos.
                </p>
                <div className="pt-2 flex items-center gap-1.5 text-xs text-muted-foreground font-mono">
                  <span className="h-2 w-2 rounded-full bg-blue-500 inline-block"></span>
                  Reglas matemáticas de Itten
                </div>
              </CardContent>
            </Card>

            {/* Tarjeta 3: Probador Virtual */}
            <Card className="overflow-hidden border border-border/80 bg-card/60 backdrop-blur transition-all hover:shadow-lg">
              <div className="relative aspect-[4/3] bg-muted/50 overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/samples/usuario_canonico.jpg"
                  alt="Modelo para el probador virtual"
                  className="h-full w-full object-cover object-top transition-transform duration-300 hover:scale-105"
                />
                <div className="absolute bottom-2 left-2 flex gap-1.5">
                  <span className="rounded bg-background/90 px-2 py-0.5 text-xs font-semibold backdrop-blur">
                    A-Pose Validada
                  </span>
                  <span className="rounded bg-background/90 px-2 py-0.5 text-xs font-mono text-muted-foreground backdrop-blur">
                    MediaPipe
                  </span>
                </div>
              </div>
              <CardContent className="p-5 space-y-2">
                <h2 className="font-semibold text-base">3. Probador Virtual VTON</h2>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Verifica tu postura corporal con MediaPipe y procesa el fotomontaje multicapa
                  mediante cola asíncrona.
                </p>
                <div className="pt-2 flex items-center gap-1.5 text-xs text-muted-foreground font-mono">
                  <span className="h-2 w-2 rounded-full bg-purple-500 inline-block"></span>
                  Worker ARQ + Redis
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Métricas y Credenciales Técnicas */}
      <section className="border-b border-border bg-muted/30 px-6 py-12">
        <div className="mx-auto max-w-5xl grid grid-cols-2 gap-8 text-center sm:grid-cols-4">
          <div>
            <div className="text-3xl font-extrabold tracking-tight">512 D</div>
            <p className="mt-1 text-xs text-muted-foreground uppercase font-mono tracking-wider">
              Embeddings de estilo
            </p>
          </div>
          <div>
            <div className="text-3xl font-extrabold tracking-tight">3 Capas</div>
            <p className="mt-1 text-xs text-muted-foreground uppercase font-mono tracking-wider">
              Multilayer VTON
            </p>
          </div>
          <div>
            <div className="text-3xl font-extrabold tracking-tight">&lt; 50 ms</div>
            <p className="mt-1 text-xs text-muted-foreground uppercase font-mono tracking-wider">
              Validación A-Pose
            </p>
          </div>
          <div>
            <div className="text-3xl font-extrabold tracking-tight">100%</div>
            <p className="mt-1 text-xs text-muted-foreground uppercase font-mono tracking-wider">
              Contenerizado en Docker
            </p>
          </div>
        </div>
      </section>

      {/* Accesos Rápidos */}
      <section className="px-6 py-16 text-center">
        <div className="mx-auto max-w-2xl space-y-4">
          <h2 className="text-2xl font-bold tracking-tight">Explorá tu guardarropa ahora</h2>
          <p className="text-sm text-muted-foreground">
            El catálogo cápsula ya incluye prendas cargadas y listas para armar outfits en el
            probador.
          </p>
          <div className="pt-4 flex justify-center gap-4">
            <Link
              href="/wardrobe"
              className="inline-flex min-h-11 items-center justify-center rounded-md bg-accent px-6 py-2.5 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent/90"
            >
              Ir al Armario Cápsula
            </Link>
            <Link
              href="/outfits"
              className="inline-flex min-h-11 items-center justify-center rounded-md border border-border px-6 py-2.5 text-sm font-medium transition-colors hover:bg-muted"
            >
              Ver Outfits Recomendados
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
