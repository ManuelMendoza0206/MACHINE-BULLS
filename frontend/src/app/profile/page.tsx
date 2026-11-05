'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, type JSX } from 'react';
import Link from 'next/link';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useProfilePreferences } from '@/features/profile/hooks/useProfilePreferences';
import { ProfileHeader } from '@/features/profile/components/ProfileHeader';
import { DefaultAestheticSelector } from '@/features/profile/components/DefaultAestheticSelector';
import { ProfileView } from '@/features/profile/components/ProfileView';
import { BentoCard, Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { KNOWN_AESTHETICS } from '@/config/aesthetics';
import { Palette, Shield, ArrowRight, User as UserIcon, Sliders } from 'lucide-react';
import { ThemeToggle } from '@/components/shell/ThemeToggle';

/**
 * profile-flow/spec.md §3.1. `proxy.ts` already protects this route, so the redirect below is
 * defensive only (direct client-side nav without a full reload, a stale session, etc.) — this
 * page never assumes it's the first line of defense.
 */
export default function ProfilePage(): JSX.Element {
  const { user, status } = useAuth();
  const router = useRouter();
  const { defaultAesthetic, setDefaultAesthetic } = useProfilePreferences();
  const [activeTab, setActiveTab] = useState<'profile' | 'settings'>('profile');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  if (status !== 'authenticated' || !user) {
    return (
      <div className="min-h-full h-full pb-20 pt-4 px-4 sm:px-6 lg:px-8 max-w-[1440px] mx-auto space-y-6 sm:space-y-8">
        <section
          aria-label="Cabecera del Perfil"
          className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch"
        >
          <BentoCard className="lg:col-span-12 p-6 sm:p-8 rounded-3xl justify-between border-border/80 bg-background/85 shadow-sm">
            <div className="space-y-2">
              <Badge
                variant="outline"
                className="rounded-full border-border/80 bg-muted/50 px-3 py-0.5 text-xs font-medium text-foreground"
              >
                Cuenta
              </Badge>
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
                Perfil
              </h1>
              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                Tu cuenta y el catálogo de tu armario.
              </p>
            </div>
          </BentoCard>
        </section>
        <section aria-label="Información de perfil">
          <ProfileView />
        </section>
      </div>
    );
  }

  return (
    <div className="min-h-full h-full pb-20 pt-4 px-4 sm:px-6 lg:px-8 max-w-[1440px] mx-auto space-y-6 sm:space-y-8">
      {/* Bento Header */}
      <section
        aria-label="Cabecera del Perfil"
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
                  {activeTab === 'profile' ? 'Tu cuenta' : 'Configuración'}
                </Badge>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/10 px-2.5 py-0.5 text-[11px] font-medium text-accent border border-accent/20">
                  <Shield className="h-3 w-3" />
                  Sesión activa
                </span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
                {activeTab === 'profile' ? 'Perfil' : 'Configuración'}
              </h1>
              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed max-w-2xl text-pretty">
                {activeTab === 'profile'
                  ? 'Gestiona tus datos de acceso, consulta las estadísticas de tu catálogo y revisa tu cuenta.'
                  : 'Ajusta tus preferencias de estilo estético y la apariencia visual de la interfaz.'}
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              <div className="inline-flex items-center rounded-full bg-muted/60 p-1 border border-border/60">
                <Button
                  type="button"
                  variant={activeTab === 'profile' ? 'default' : 'ghost'}
                  size="sm"
                  className="rounded-full text-xs h-8 px-3 gap-1.5"
                  onClick={() => setActiveTab('profile')}
                >
                  <UserIcon className="h-3.5 w-3.5" />
                  Perfil
                </Button>
                <Button
                  type="button"
                  variant={activeTab === 'settings' ? 'default' : 'ghost'}
                  size="sm"
                  className="rounded-full text-xs h-8 px-3 gap-1.5"
                  onClick={() => setActiveTab('settings')}
                >
                  <Sliders className="h-3.5 w-3.5" />
                  Configuración
                </Button>
              </div>

              <Button asChild variant="outline" size="sm" className="rounded-full text-xs h-8">
                <Link href="/wardrobe">
                  Ir al armario
                  <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>
          </div>
        </BentoCard>
      </section>

      {/* Vista de Perfil */}
      {activeTab === 'profile' && (
        <div className="space-y-6">
          <section
            aria-label="Información de usuario"
            className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch"
          >
            <div className="lg:col-span-12">
              <ProfileHeader
                name={user.name ?? user.email}
                email={user.email}
                createdAt={user.createdAt}
              />
            </div>
          </section>

          <section aria-label="Módulos de cuenta y catálogo">
            <ProfileView />
          </section>
        </div>
      )}

      {/* Vista de Configuración (Estética y Apariencia) */}
      {activeTab === 'settings' && (
        <section
          aria-label="Ajustes de configuración"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6 items-stretch"
        >
          <div className="lg:col-span-6">
            <Card className="h-full flex flex-col justify-between rounded-3xl border border-border/80 bg-background/85 shadow-sm p-6 sm:p-7">
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-foreground font-semibold pb-3 border-b border-border/60">
                  <Palette className="h-4 w-4 text-accent" />
                  <h2 className="text-base font-bold tracking-tight">Estética favorita</h2>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed text-pretty">
                  Define tu estilo de referencia para priorizar las sugerencias del recomendador de
                  outfits.
                </p>
                <div className="pt-1">
                  <DefaultAestheticSelector
                    value={defaultAesthetic}
                    onChange={setDefaultAesthetic}
                    availableAesthetics={[...KNOWN_AESTHETICS]}
                  />
                </div>
              </div>
              <div className="pt-4 mt-4 border-t border-border/50 text-[11px] text-muted-foreground">
                Se guarda de forma local en tu navegador
              </div>
            </Card>
          </div>

          <div className="lg:col-span-6">
            <Card className="h-full flex flex-col justify-between rounded-3xl border border-border/80 bg-background/85 shadow-sm p-6 sm:p-7">
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-foreground font-semibold pb-3 border-b border-border/60">
                  <Sliders className="h-4 w-4 text-accent" />
                  <h2 className="text-base font-bold tracking-tight">Apariencia visual</h2>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed text-pretty">
                  Cambia entre tema claro, oscuro o sincronizado automáticamente con la preferencia
                  de tu sistema operativo.
                </p>
                <div className="pt-2 flex items-center justify-between p-3 rounded-2xl bg-muted/30 border border-border/40">
                  <span className="text-xs font-medium">Tema de la aplicación</span>
                  <ThemeToggle />
                </div>
              </div>
              <div className="pt-4 mt-4 border-t border-border/50 text-[11px] text-muted-foreground">
                Aplica en todas las páginas de la aplicación
              </div>
            </Card>
          </div>
        </section>
      )}
    </div>
  );
}
