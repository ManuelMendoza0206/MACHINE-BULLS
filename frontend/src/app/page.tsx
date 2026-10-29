import type { JSX } from 'react';
import Link from 'next/link';
import { ArrowRight, Layers, Palette, ScanLine } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
    title: 'Digitalizá',
    body: 'Subís la foto de una prenda. CLIP la clasifica, le asigna una posición y extrae sus colores dominantes en HSV.',
    data: '512 dimensiones · CLIP ViT-B/32',
    Icon: ScanLine,
  },
  {
    title: 'Combiná',
    body: 'El recomendador cruza posición, contraste y afinidad cromática. Cada outfit sale con dos puntajes medidos, no estimados a ojo.',
    data: '2 puntajes · armonía HSV + embedding',
    Icon: Palette,
  },
  {
    title: 'Probate',
    body: 'CatVTON genera el outfit capa por capa sobre tu foto: inferiores, superiores y abrigo, en ese orden.',
    data: '1 a 6 capas · difusión secuencial',
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
    <div className="pb-16">
      {/* Portada: la tesis del muestrario en un solo viewport. */}
      <section className="border-b border-border">
        <div className="mx-auto grid max-w-[1440px] items-start gap-10 px-4 py-10 sm:px-6 lg:grid-cols-12 lg:gap-12 lg:px-10 lg:py-16">
          <div className="flex flex-col justify-between lg:col-span-7">
            <div>
              <h1 className="display animate-enter text-[clamp(2.85rem,7.4vw,5.5rem)]">
                Probate
                <br />
                tu armario.
              </h1>
              <p
                className="animate-enter mt-6 max-w-[48ch] text-base leading-relaxed text-muted-foreground sm:text-lg"
                style={{ animationDelay: '80ms' }}
              >
                Subí una foto de cada prenda, mirá qué combina de verdad y vestite con el outfit
                elegido sobre tu propio cuerpo. Difusión multicapa, no un fotomontaje.
              </p>
              <div
                className="animate-enter mt-8 flex flex-col gap-3 sm:flex-row"
                style={{ animationDelay: '160ms' }}
              >
                <LandingCta />
                <Button asChild size="lg" variant="secondary">
                  <Link href="/try-on">
                    Ver el probador
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </Button>
              </div>
            </div>

            <div className="animate-enter mt-10" style={{ animationDelay: '240ms' }}>
              <div className="flex items-end justify-between gap-4 border-b border-border pb-2">
                <p className="label text-muted-foreground">Muestras del armario</p>
                <p className="num text-[10px] text-muted-foreground">05 REF.</p>
              </div>
              <ul className="mt-3 grid grid-cols-5 gap-2 sm:gap-3">
                {SAMPLES.map(sample => (
                  <li key={sample.src} className="paper p-1">
                    <div className="relative aspect-[4/5] overflow-hidden bg-muted">
                      {/* eslint-disable-next-line @next/next/no-img-element -- muestras locales del demo */}
                      <img
                        src={sample.src}
                        alt={`Muestra ${sample.label}`}
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                      <span className="num absolute left-1 top-1 bg-background/90 px-1 text-[9px] font-semibold text-foreground">
                        {sample.ref}
                      </span>
                    </div>
                    <p className="label mt-1.5 truncate text-[8px] text-muted-foreground">
                      {sample.label}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Ficha de muestra: el objeto del mundo, con datos reales del pipeline. */}
          <div className="animate-enter lg:col-span-5" style={{ animationDelay: '120ms' }}>
            <div className="relative mx-auto w-full max-w-[430px]">
              <div
                aria-hidden="true"
                className="absolute inset-0 translate-x-3 translate-y-3 border border-accent/30 bg-accent/10"
              />
              <article className="paper relative">
                <div className="flex items-center justify-between border-b border-border px-3 py-2">
                  <span className="label text-muted-foreground">Ficha 001 · Modelo</span>
                  <Badge variant="outline" className="border-thread/40 text-thread">
                    A-Pose
                  </Badge>
                </div>
                <div className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element -- muestra local del demo */}
                  <img
                    src="/samples/usuario_canonico.jpg"
                    alt="Modelo de cuerpo completo en pose A, listo para la prueba virtual"
                    className="aspect-[3/4] w-full object-cover"
                  />
                  <span className="animate-stamp absolute right-3 top-3 inline-block border-2 border-thread px-2 py-1 text-thread">
                    <span className="label text-[9px]">Listo para probar</span>
                  </span>
                </div>
                <dl className="grid grid-cols-3 divide-x divide-border border-t border-border">
                  <div className="px-3 py-2.5">
                    <dt className="label text-muted-foreground">Capas</dt>
                    <dd className="num mt-1 text-sm font-semibold">1–6</dd>
                  </div>
                  <div className="px-3 py-2.5">
                    <dt className="label text-muted-foreground">Entrada</dt>
                    <dd className="mt-1 text-sm font-semibold">JPEG</dd>
                  </div>
                  <div className="px-3 py-2.5">
                    <dt className="label text-muted-foreground">Salida</dt>
                    <dd className="mt-1 text-sm font-semibold">1 foto</dd>
                  </div>
                </dl>
              </article>
            </div>
          </div>
        </div>
      </section>

      {/* La secuencia real del producto. */}
      <section className="border-b border-border">
        <div className="mx-auto max-w-[1440px] px-4 py-14 sm:px-6 lg:px-10">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <h2 className="display text-[clamp(1.9rem,3.4vw,3rem)]">Del cajón al espejo.</h2>
            <p className="max-w-[38ch] text-sm leading-relaxed text-muted-foreground">
              Tres pasos, todos con datos que el sistema realmente produce.
            </p>
          </div>

          <ol className="mt-9 grid gap-px border border-border bg-border sm:grid-cols-3">
            {STEPS.map((step, index) => (
              <li key={step.title} className="flex flex-col bg-background p-6">
                <div className="flex items-center justify-between">
                  <span className="num display text-[2.4rem] leading-none text-thread">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <step.Icon className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
                </div>
                <h3 className="mt-5 text-lg font-semibold tracking-tight">{step.title}</h3>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">
                  {step.body}
                </p>
                <p className="label mt-6 border-t border-border pt-3 text-muted-foreground">
                  {step.data}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* El mecanismo: color medido, no adivinado. */}
      <section className="border-b border-border bg-background">
        <div className="mx-auto grid max-w-[1440px] gap-10 px-4 py-14 sm:px-6 lg:grid-cols-12 lg:px-10">
          <div className="lg:col-span-5">
            <h2 className="display text-[clamp(1.9rem,3.4vw,3rem)]">
              La armonía se mide,
              <br />
              no se adivina.
            </h2>
            <p className="mt-4 max-w-[46ch] text-sm leading-relaxed text-muted-foreground">
              Cada prenda llega con sus colores dominantes. El recomendador compara luminosidad y
              afinidad de matiz, y ordena los outfits por dos puntajes independientes.
            </p>
            <ul className="mt-7 space-y-4">
              <li className="flex gap-3">
                <span className="num label pt-0.5 text-thread">01</span>
                <div>
                  <p className="text-sm font-semibold">Contraste de luminosidad</p>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                    Evita combinaciones que se apagan entre sí o compiten por el mismo plano.
                  </p>
                </div>
              </li>
              <li className="flex gap-3">
                <span className="num label pt-0.5 text-thread">02</span>
                <div>
                  <p className="text-sm font-semibold">Afinidad cromática</p>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                    Mide qué tan cerca están los matices en la rueda antes de proponer el conjunto.
                  </p>
                </div>
              </li>
              <li className="flex gap-3">
                <span className="num label pt-0.5 text-thread">03</span>
                <div>
                  <p className="text-sm font-semibold">Compatibilidad de estilo</p>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                    Cruza los embeddings CLIP de las prendas para que el outfit no sea solo color.
                  </p>
                </div>
              </li>
            </ul>
          </div>

          <div className="lg:col-span-7">
            <div className="paper">
              <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
                <span className="label">Muestra cromática</span>
                <span className="num text-[10px] text-muted-foreground">HSV · EJEMPLO DE SALIDA</span>
              </div>
              <div className="grid grid-cols-3 gap-px bg-border">
                {CHIPS.map(chip => (
                  <div key={chip.hex} className="bg-background p-3">
                    <div
                      className="h-24 w-full border border-border"
                      style={{ backgroundColor: chip.hex }}
                    />
                    <p className="label mt-2">{chip.name}</p>
                    <p className="num mt-1 text-[10px] text-muted-foreground">{chip.hex}</p>
                    <p className="num text-[10px] text-muted-foreground">{chip.hsv}</p>
                  </div>
                ))}
              </div>
              <div className="space-y-4 border-t border-border p-4">
                <ScoreGauge label="Armonía cromática" value={94} />
                <ScoreGauge label="Compatibilidad de estilo" value={87} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Cierre: la acción primaria del producto. */}
      <section className="mx-auto max-w-[1440px] px-4 pt-14 sm:px-6 lg:px-10">
        <div className="relative overflow-hidden bg-accent px-6 py-12 text-accent-foreground sm:px-12">
          <div aria-hidden="true" className="grain absolute inset-0 opacity-50" />
          <div className="relative flex flex-wrap items-end justify-between gap-8">
            <div>
              <h2 className="display max-w-[16ch] text-[clamp(2rem,4.4vw,3.4rem)]">
                Empezá por una prenda.
              </h2>
              <p className="mt-3 max-w-[48ch] text-sm leading-relaxed text-accent-foreground/75">
                El armario se arma solo: subís la primera foto y el recomendador hace el resto.
              </p>
            </div>
            <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
              <Button asChild size="lg" variant="thread">
                <Link href="/wardrobe">Abrir el armario</Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="border-accent-foreground/45 text-accent-foreground hover:bg-accent-foreground/10"
              >
                <Link href="/outfits">Ver outfits</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
