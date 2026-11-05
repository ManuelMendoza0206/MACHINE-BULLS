import type { JSX } from 'react';
import Link from 'next/link';
import { ArrowRight, Layers, Palette, ScanLine, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BentoCard } from '@/components/ui/card';
import { ScoreGauge } from '@/components/ui/score-gauge';
import { LandingCta } from '@/features/auth/components/LandingCta';

const SAMPLES = [
  { src: '/samples/prenda_camiseta.jpg', label: 'Camiseta', ref: 'P-01' },
  { src: '/samples/prenda_pantalon.jpg', label: 'Pantalón', ref: 'P-02' },
  { src: '/samples/prenda_chaqueta.jpg', label: 'Chaqueta', ref: 'P-03' },
  { src: '/samples/usuario_canonico.jpg', label: 'Modelo A-Pose', ref: 'M-01' },
  { src: '/samples/usuario_apose.jpg', label: 'Prueba de pose', ref: 'M-02' },
] as const;

const STEPS = [
  {
    title: 'Sube tus prendas',
    body: 'Toma una foto de cada prenda. El sistema quita el fondo y detecta su categoría y colores principales.',
    data: 'Corte de fondo y colorimetría',
    Icon: ScanLine,
  },
  {
    title: 'Arma combinaciones',
    body: 'Revisa el contraste tonal y la compatibilidad entre prendas antes de decidir qué ponerte.',
    data: 'Armonía cromática y estilo',
    Icon: Palette,
  },
  {
    title: 'Pruébalo en tu foto',
    body: 'El probador ajusta las prendas sobre tu foto en orden: parte inferior, superior y abrigo.',
    data: 'Prueba virtual por capas',
    Icon: Layers,
  },
] as const;

const CHIPS = [
  { name: 'Camiseta', hex: '#2F4F7A', hsv: '212° 61% 48%' },
  { name: 'Pantalón', hex: '#C8C2B4', hsv: '40° 10% 78%' },
  { name: 'Chaqueta', hex: '#6B4A32', hsv: '24° 53% 42%' },
] as const;

export default function Home(): JSX.Element {
  return (
    <div className="min-h-full h-full pb-20 pt-4 px-4 sm:px-6 lg:px-8 max-w-[1440px] mx-auto space-y-8 sm:space-y-12">
      {/* Hero Section: Bento Asimétrico 2-Columnas (Equilibrio horizontal y vertical) */}
      <section
        aria-label="Hero Showcase"
        className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch pt-4 sm:pt-6"
      >
        {/* Hero Bento Izquierdo: Propuesta de valor, CTA y garantías */}
        <BentoCard
          glow
          className="lg:col-span-7 p-8 sm:p-10 lg:p-12 rounded-3xl justify-between border-border/80 bg-background/85 shadow-sm"
        >
          <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant="outline"
                className="rounded-full border-border/80 bg-muted/50 px-3.5 py-1 text-xs font-medium text-foreground"
              >
                StyleMe · Probador virtual multicapa
              </Badge>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-0.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Difusión activa
              </span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-foreground leading-[1.08] text-balance">
              Pruébate la ropa de tu armario{' '}
              <span className="text-accent underline decoration-accent/40 underline-offset-8">
                antes de vestirte
              </span>
              .
            </h1>

            <p className="max-w-xl text-base sm:text-lg text-muted-foreground leading-relaxed text-pretty">
              Sube fotos de tus prendas, revisa qué tan bien combinan por color y pruébalas capa por
              capa sobre una foto de tu cuerpo.
            </p>
          </div>

          <div className="space-y-6 pt-8 mt-4 border-t border-border/60">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <LandingCta />
              <Button asChild size="lg" variant="secondary" className="rounded-full h-11 px-6">
                <Link href="/try-on">
                  Ver el probador
                  <ArrowRight className="h-4 w-4 ml-1.5" aria-hidden="true" />
                </Link>
              </Button>
            </div>

            <div className="flex flex-wrap items-center gap-y-2 gap-x-4 text-xs text-muted-foreground pt-1">
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-accent" />
                Sin registro obligatorio
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-accent" />
                Validación de pose frontal
              </span>
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-accent" />
                Procesamiento privado
              </span>
            </div>
          </div>
        </BentoCard>

        {/* Hero Bento Derecho: Vitrina interactiva y preview en vivo */}
        <BentoCard className="lg:col-span-5 p-6 sm:p-7 rounded-3xl justify-between border-border/80 bg-background/85 shadow-sm overflow-hidden">
          <div>
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-border/50">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-mono font-medium text-foreground">
                  CatVTON sobre silueta
                </span>
              </div>
              <Badge
                variant="outline"
                className="text-[11px] font-mono text-accent border-accent/30"
              >
                Hasta 6 capas
              </Badge>
            </div>

            <div className="relative aspect-[4/3] sm:aspect-[16/10] lg:aspect-[4/3] w-full overflow-hidden rounded-2xl bg-muted/40 border border-border/60">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/samples/usuario_canonico.jpg"
                alt="Modelo en probador virtual VTON"
                className="h-full w-full object-cover object-top transition-transform duration-500 hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background/95 via-background/20 to-transparent" />
              <div className="absolute top-3 left-3 flex flex-wrap gap-2">
                <span className="rounded-full bg-accent px-2.5 py-1 text-[11px] font-semibold text-accent-foreground shadow-xs">
                  Prueba por capas
                </span>
                <span className="rounded-full bg-background/90 px-2.5 py-1 text-[11px] font-mono text-foreground backdrop-blur-md border border-border/50">
                  Alineación de postura
                </span>
              </div>
              <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-xs font-mono text-foreground backdrop-blur-md bg-background/85 px-3 py-1.5 rounded-xl border border-border/50 shadow-xs">
                <span>Postura A-Pose</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                  100% Detectada
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-border/60 space-y-2">
            <p className="text-xs font-semibold text-foreground">Capas activas en la prueba:</p>
            <div className="grid grid-cols-3 gap-2">
              {CHIPS.map(chip => (
                <div
                  key={chip.name}
                  className="flex items-center gap-2 p-1.5 rounded-xl bg-muted/40 border border-border/40"
                >
                  <span
                    className="h-3 w-3 rounded-full shrink-0 border border-border/60"
                    style={{ backgroundColor: chip.hex }}
                  />
                  <div className="truncate">
                    <p className="text-[11px] font-medium leading-none truncate">{chip.name}</p>
                    <p className="text-[9px] font-mono text-muted-foreground">{chip.hex}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </BentoCard>
      </section>

      {/* Bento Grid Principal: 4 columnas modulares con ritmo visual asimétrico */}
      <section
        aria-label="Showcase Bento Grid"
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch"
      >
        {/* Bento 1: Héroe VTON Multicapa (2 cols x 2 rows en desktop) */}
        <BentoCard
          glow
          className="md:col-span-2 lg:col-span-2 md:row-span-2 min-h-[440px] sm:min-h-[500px] justify-between p-0 overflow-hidden rounded-3xl border-border/80 bg-background/85"
        >
          <div className="relative aspect-[4/3] sm:aspect-[16/11] lg:aspect-auto lg:h-[340px] w-full bg-muted/40 overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/samples/usuario_canonico.jpg"
              alt="Modelo en probador virtual VTON"
              className="h-full w-full object-cover object-top transition-transform duration-500 hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background/95 via-background/25 to-transparent" />
            <div className="absolute top-4 left-4 flex flex-wrap gap-2">
              <span className="rounded-full bg-accent px-3 py-1 text-xs font-semibold text-accent-foreground shadow-xs">
                Prueba por capas
              </span>
              <span className="rounded-full bg-background/90 px-3 py-1 text-xs font-mono text-foreground backdrop-blur-md border border-border/50">
                Alineación de postura
              </span>
            </div>
            <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-xs font-mono text-foreground backdrop-blur-md bg-background/85 px-3.5 py-2 rounded-2xl border border-border/50 shadow-xs">
              <span className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                CatVTON sobre silueta
              </span>
              <span className="text-accent font-semibold">Hasta 6 capas</span>
            </div>
          </div>
          <div className="p-6 sm:p-7 space-y-2">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              Probador virtual sobre tu foto
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed text-pretty">
              Superpone las prendas respetando la postura de tu cuerpo y el orden de cada capa sin
              deformar la foto original.
            </p>
          </div>
        </BentoCard>

        {/* Bento 2: Armonía Cromática y Estilo (2 cols x 1 row) */}
        <BentoCard className="md:col-span-2 lg:col-span-2 p-6 sm:p-7 rounded-3xl justify-between border-border/80 bg-background/85">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Palette className="h-5 w-5 text-accent" />
                <h2 className="text-lg font-bold tracking-tight">Armonía de color</h2>
              </div>
              <Badge variant="outline" className="rounded-full text-xs font-mono">
                HSV + CLIP
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed mb-4 text-pretty">
              Evalúa el contraste entre prendas según el círculo cromático y la afinidad de estilo.
            </p>

            <div className="grid grid-cols-3 gap-2.5 mb-5">
              {CHIPS.map(chip => (
                <div
                  key={chip.hex}
                  className="rounded-2xl border border-border/70 bg-background/70 p-2.5 text-center"
                >
                  <div
                    className="h-12 w-full rounded-xl border border-border/50 mb-2 shadow-xs"
                    style={{ backgroundColor: chip.hex }}
                  />
                  <p className="text-xs font-semibold truncate">{chip.name}</p>
                  <p className="text-[10px] font-mono text-muted-foreground">{chip.hex}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-3 pt-3 border-t border-border/60">
            <ScoreGauge label="Armonía cromática" value={94} />
            <ScoreGauge label="Compatibilidad de estilo" value={87} />
          </div>
        </BentoCard>

        {/* Bento 3: Corte de fondo (1 col x 1 row) */}
        <BentoCard className="p-6 rounded-3xl border-border/80 bg-background/85 justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="grid h-10 w-10 place-items-center rounded-2xl bg-accent/10 text-accent">
                <ScanLine className="h-5 w-5" />
              </div>
              <span className="text-xs font-mono text-muted-foreground">U2Net</span>
            </div>
            <h3 className="text-base font-bold text-foreground">Corte de fondo</h3>
            <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed text-pretty">
              Separa la prenda del fondo para dejarla lista para combinar y probar.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-border/40 text-[11px] font-mono text-accent">
            Precisión de máscara de silueta
          </div>
        </BentoCard>

        {/* Bento 4: Categorización (1 col x 1 row) */}
        <BentoCard className="p-6 rounded-3xl border-border/80 bg-background/85 justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="grid h-10 w-10 place-items-center rounded-2xl bg-accent/10 text-accent">
                <Layers className="h-5 w-5" />
              </div>
              <span className="text-xs font-mono text-muted-foreground">CLIP</span>
            </div>
            <h3 className="text-base font-bold text-foreground">Categorización</h3>
            <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed text-pretty">
              Identifica el tipo de prenda y su estilo a partir de la imagen sin carga manual.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-border/40 text-[11px] font-mono text-accent">
            Clasificación zero-shot
          </div>
        </BentoCard>

        {/* Bento 5: Muestras del Armario (4 cols full width) */}
        <BentoCard className="md:col-span-2 lg:col-span-4 p-6 sm:p-7 rounded-3xl border-border/80 bg-background/85">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-2 border-b border-border/60">
            <div>
              <h2 className="text-lg font-bold text-foreground">Prendas de ejemplo</h2>
              <p className="text-xs text-muted-foreground">Prendas básicas listas para probar</p>
            </div>
            <span className="text-xs font-mono font-semibold text-accent bg-accent/10 px-3 py-1 rounded-full self-start sm:self-auto">
              05 PRENDAS
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2">
            {SAMPLES.map(sample => (
              <div
                key={sample.src}
                className="group relative overflow-hidden rounded-2xl border border-border/80 bg-background/60 p-2 transition-all hover:border-accent/40 hover:shadow-xs"
              >
                <div className="relative aspect-[4/5] overflow-hidden rounded-xl bg-muted/30">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={sample.src}
                    alt={`Muestra ${sample.label}`}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    loading="lazy"
                  />
                  <span className="absolute top-1.5 left-1.5 rounded-full bg-background/90 px-2 py-0.5 text-[9px] font-mono font-semibold text-foreground backdrop-blur-xs">
                    {sample.ref}
                  </span>
                </div>
                <p className="mt-2 text-xs font-semibold text-foreground truncate px-1">
                  {sample.label}
                </p>
              </div>
            ))}
          </div>
        </BentoCard>
      </section>

      {/* Secuencia del Flujo: 3 Compartimentos Bento alineados horizontal y verticalmente */}
      <section aria-label="Flujo de tres pasos" className="space-y-6">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Cómo funciona
          </h2>
          <p className="text-sm text-muted-foreground text-pretty">
            Tres pasos desde las prendas de tu armario hasta la prueba sobre tu silueta.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
          {STEPS.map((step, index) => (
            <BentoCard
              key={step.title}
              className="p-6 sm:p-7 rounded-3xl justify-between border-border/80 bg-background/85"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-3xl font-extrabold text-accent/30 font-mono">
                    0{index + 1}
                  </span>
                  <div className="grid h-10 w-10 place-items-center rounded-2xl bg-muted text-foreground">
                    <step.Icon className="h-5 w-5" aria-hidden="true" />
                  </div>
                </div>
                <h3 className="text-lg font-bold text-foreground mb-2">{step.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed text-pretty">
                  {step.body}
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-border/60">
                <span className="text-xs font-mono text-muted-foreground">{step.data}</span>
              </div>
            </BentoCard>
          ))}
        </div>
      </section>
    </div>
  );
}
