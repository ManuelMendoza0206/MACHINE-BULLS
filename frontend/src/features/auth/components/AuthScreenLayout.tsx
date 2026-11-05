'use client';

import type { JSX, ReactNode } from 'react';
import Link from 'next/link';
import { Layers, ShieldCheck, Sparkles, Shirt, ArrowRight } from 'lucide-react';
import { ThemeToggle } from '@/components/shell/ThemeToggle';
import { BentoCard } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils/cn';

interface AuthScreenLayoutProps {
  mode: 'login' | 'signup';
  title: string;
  subtitle: string;
  children: ReactNode;
}

export function AuthScreenLayout({
  mode,
  title,
  subtitle,
  children,
}: AuthScreenLayoutProps): JSX.Element {
  const isLogin = mode === 'login';

  return (
    <div className="min-h-full h-full w-full flex items-center justify-center p-4 sm:p-6 lg:p-10 bg-background antialiased">
      <div className="w-full max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Bento Izquierdo: Showcase de Marca y Features (Visible en lg+) */}
        <BentoCard
          glow
          className="hidden lg:flex lg:col-span-5 p-8 xl:p-10 rounded-3xl justify-between min-h-[580px] bg-background/70 backdrop-blur-xl border-border/80 shadow-md"
        >
          <div>
            <div className="flex items-center justify-between mb-8">
              <Link
                href="/wardrobe"
                className="flex items-center gap-3 transition-transform hover:scale-105"
                aria-label="Ir al inicio de StyleMe"
              >
                <span className="relative grid h-9 w-9 shrink-0 place-items-center rounded-full bg-accent text-accent-foreground shadow-xs">
                  <span className="h-3.5 w-3.5 rounded-full bg-background" />
                </span>
                <span className="font-extrabold tracking-wider text-xl text-foreground">
                  STYLEME
                </span>
              </Link>
              <Badge
                variant="outline"
                className="rounded-full text-xs font-normal text-muted-foreground"
              >
                Probador virtual
              </Badge>
            </div>

            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground leading-snug">
              Tu armario personal y probador virtual.
            </h2>
            <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
              Organiza tus prendas, revisa combinaciones de color y pruébalas sobre tu foto antes de
              ponértelas.
            </p>

            <div className="mt-8 space-y-4">
              <div className="flex items-start gap-3.5 p-3 rounded-2xl bg-muted/40 border border-border/50">
                <div className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-accent/10 text-accent mt-0.5">
                  <Shirt className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-foreground">Corte de fondo</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Separa cada prenda de la foto y extrae sus tonos principales.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3.5 p-3 rounded-2xl bg-muted/40 border border-border/50">
                <div className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-accent/10 text-accent mt-0.5">
                  <Layers className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-foreground">Armonía de color</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Evalúa el contraste y la afinidad de estilo entre las prendas elegidas.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3.5 p-3 rounded-2xl bg-muted/40 border border-border/50">
                <div className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-accent/10 text-accent mt-0.5">
                  <Sparkles className="h-4 w-4 text-accent" />
                </div>
                <div>
                  <p className="text-xs font-bold text-foreground">Prueba por capas</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Superpone pantalón, camiseta y abrigo respetando la postura de tu cuerpo.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-border/60 flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-accent" />
              <span>Tus fotos se procesan de forma privada</span>
            </div>
            <ThemeToggle className="rounded-full hover:bg-muted" />
          </div>
        </BentoCard>

        {/* Bento Derecho: Módulo Central de Autenticación */}
        <section
          aria-label={isLogin ? 'Iniciar sesión en StyleMe' : 'Crear cuenta en StyleMe'}
          className="col-span-1 lg:col-span-7 flex flex-col justify-between rounded-3xl border border-border/80 bg-background/90 p-6 sm:p-10 lg:p-12 shadow-lg backdrop-blur-xl relative"
        >
          {/* Barra superior del formulario */}
          <div className="flex items-center justify-between w-full mb-6">
            <Link
              href="/wardrobe"
              className="flex items-center gap-2.5 lg:hidden"
              aria-label="Ir al inicio de StyleMe"
            >
              <span className="relative grid h-7 w-7 shrink-0 place-items-center rounded-full bg-accent text-accent-foreground">
                <span className="h-3 w-3 rounded-full bg-background" />
              </span>
              <span className="font-extrabold tracking-wider text-base text-foreground">
                STYLEME
              </span>
            </Link>

            <div className="lg:hidden ml-auto">
              <ThemeToggle className="rounded-full" />
            </div>

            <div className="hidden lg:flex items-center gap-2 ml-auto text-xs text-muted-foreground">
              <span>{isLogin ? '¿No tienes cuenta?' : '¿Ya tienes cuenta?'}</span>
              <Link
                href={isLogin ? '/signup' : '/login'}
                className="inline-flex items-center gap-1 font-semibold text-accent underline underline-offset-4 hover:text-accent/80 transition-colors"
              >
                <span>{isLogin ? 'Crear cuenta' : 'Iniciar sesión'}</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>

          {/* Formulario alineado en Bento Card */}
          <div className="w-full max-w-md mx-auto my-auto">
            <div className="mb-6 text-left">
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
                {title}
              </h1>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{subtitle}</p>
            </div>

            {/* Selector de pestañas píldora */}
            <div
              role="tablist"
              aria-label="Opciones de autenticación"
              className="grid grid-cols-2 rounded-full bg-muted/80 p-1 text-xs font-semibold mb-6 border border-border/50"
            >
              <Link
                href="/login"
                role="tab"
                aria-selected={isLogin}
                className={cn(
                  'flex items-center justify-center rounded-full py-2.5 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
                  isLogin
                    ? 'bg-background text-foreground shadow-xs font-bold'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                Iniciar sesión
              </Link>
              <Link
                href="/signup"
                role="tab"
                aria-selected={!isLogin}
                className={cn(
                  'flex items-center justify-center rounded-full py-2.5 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
                  !isLogin
                    ? 'bg-background text-foreground shadow-xs font-bold'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                Crear cuenta
              </Link>
            </div>

            {/* Contenedor del Formulario */}
            <div>{children}</div>
          </div>

          {/* Footer en mobile */}
          <div className="w-full text-center border-t border-border/60 pt-4 mt-6 text-xs text-muted-foreground">
            <span>{isLogin ? '¿Aún sin cuenta? ' : '¿Ya tienes cuenta? '}</span>
            <Link
              href={isLogin ? '/signup' : '/login'}
              className="font-semibold text-accent underline underline-offset-4"
            >
              {isLogin ? 'Regístrate gratis' : 'Inicia sesión'}
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
