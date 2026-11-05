'use client';

import { type JSX } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useMe } from '@/features/auth/hooks/useMe';
import { listCapsuleGarments } from '@/features/garments/api/listCapsuleGarments';
import { getHealth } from '@/features/profile/api/getHealth';
import { mapStatusToUserMessage } from '@/lib/api/mapStatusToUserMessage';
import { ApiError } from '@/lib/errors';

const POSITION_LABEL: Record<string, string> = {
  top: 'Parte superior',
  bottom: 'Parte inferior',
  footwear: 'Calzado',
  outerwear: 'Abrigo',
};

/**
 * `/profile` composition root: identidad (usuario demo del backend), stats del
 * armario derivadas del catálogo real, estado del sistema (motor CLIP local y
 * proveedor VTON activo — clave para la demo: mock hoy, VM propia mañana) y
 * cierre de sesión.
 */
export function ProfileView(): JSX.Element {
  const { signOut, status: authStatus } = useAuth();
  const { data: me, isLoading, error } = useMe();

  const capsule = useQuery({
    queryKey: ['capsule'],
    queryFn: ({ signal }) => listCapsuleGarments(signal),
  });

  const health = useQuery({
    queryKey: ['health'],
    queryFn: ({ signal }) => getHealth(signal),
    staleTime: 30_000,
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full rounded-lg" />
        <Skeleton className="h-48 w-full rounded-lg" />
      </div>
    );
  }

  if (error) {
    const isAuthError = error instanceof ApiError && (error.status === 401 || error.status === 403);
    const msg =
      error instanceof ApiError
        ? mapStatusToUserMessage(error.status, error.responseBody)
        : 'No pudimos cargar tu perfil. ¿Está el backend levantado?';
    return (
      <div className="rounded-lg border border-border p-6 text-center">
        <p role="alert" className="text-sm text-muted-foreground">
          {msg}
        </p>
        <div className="mt-4 flex items-center justify-center gap-3">
          {isAuthError && (
            <Button
              type="button"
              variant="default"
              onClick={async () => {
                await signOut();
                // eslint-disable-next-line @next/next/no-location-assign-relative-destination
                window.location.href = '/login';
              }}
            >
              Iniciar sesión
            </Button>
          )}
          <Button type="button" variant="secondary" onClick={() => window.location.reload()}>
            Reintentar
          </Button>
        </div>
      </div>
    );
  }

  const garments = capsule.data?.garments ?? [];
  const porPosition = garments.reduce<Record<string, number>>((acc, g) => {
    const key = g.position ?? 'sin posición';
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6 items-stretch">
      {/* Bento Cuenta */}
      <Card className="lg:col-span-6 h-full flex flex-col justify-between rounded-3xl border border-border/80 bg-background/85 shadow-sm p-6 sm:p-7">
        <div className="space-y-4">
          <div className="pb-3 border-b border-border/60">
            <h2 className="text-lg font-bold tracking-tight text-foreground">Cuenta</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Información de acceso y sesión</p>
          </div>
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-muted-foreground">Correo electrónico</span>
              <span className="font-medium text-xs sm:text-sm">{me?.email}</span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-muted-foreground">ID de cuenta</span>
              <span
                className="truncate font-mono text-xs bg-muted/50 px-2 py-0.5 rounded-md"
                title={me?.user_id}
              >
                {me?.user_id.slice(0, 8)}…
              </span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-muted-foreground">Estado</span>
              <span className="inline-flex items-center gap-1.5 text-xs font-medium">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                {authStatus === 'authenticated' ? 'Sesión activa' : 'Modo demostración'}
              </span>
            </div>
          </div>
        </div>
        <div className="pt-4 mt-4 border-t border-border/60">
          <Button
            type="button"
            variant="secondary"
            className="w-full rounded-full text-xs h-10"
            onClick={() => void signOut()}
          >
            Cerrar sesión
          </Button>
        </div>
      </Card>

      {/* Bento Tu Armario */}
      <Card className="lg:col-span-6 h-full flex flex-col justify-between rounded-3xl border border-border/80 bg-background/85 shadow-sm p-6 sm:p-7">
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-border/60">
            <div>
              <h2 className="text-lg font-bold tracking-tight text-foreground">Tu armario</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Prendas disponibles en tu catálogo
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Prendas digitizadas</span>
              <span className="text-2xl font-extrabold font-mono text-accent">
                {garments.length}
              </span>
            </div>
          </div>

          {garments.length > 0 ? (
            <div className="space-y-3">
              <ul className="space-y-1.5 text-xs">
                {Object.entries(porPosition).map(([pos, count]) => (
                  <li
                    key={pos}
                    className="flex items-center justify-between py-1 border-b border-border/40 last:border-0"
                  >
                    <span className="text-muted-foreground">{POSITION_LABEL[pos] ?? pos}</span>
                    <span className="font-mono font-semibold text-foreground">{count}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground leading-relaxed">
              Todavía no has subido prendas — empieza desde el armario.
            </p>
          )}
        </div>
        <div className="pt-4 mt-4 border-t border-border/60 text-xs text-muted-foreground">
          Prendas listas para combinar en el probador
        </div>
      </Card>

      {/* Diagnóstico técnico accesible y discreto (conserva testids para verificación) */}
      <div className="lg:col-span-12">
        <details className="group rounded-2xl border border-border/50 bg-background/50 p-4 transition-all">
          <summary className="cursor-pointer text-xs font-medium text-muted-foreground hover:text-foreground flex items-center justify-between select-none">
            <span>Información técnica del servicio</span>
            <span className="text-[10px] uppercase font-mono tracking-wider opacity-70 group-open:rotate-180 transition-transform">
              ▼
            </span>
          </summary>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 mt-2 border-t border-border/40 text-xs text-muted-foreground">
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-muted/30">
              <span>Clasificación</span>
              <span className="font-mono text-[11px] text-foreground">
                CLIP local · openai/clip-vit-base-patch32
              </span>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-muted/30">
              <span>Motor de prueba</span>
              <span
                className="font-mono font-semibold text-accent text-[11px]"
                data-testid="vton-provider"
              >
                {health.data ? health.data.vton_provider : '…'}
              </span>
            </div>
          </div>
        </details>
      </div>
    </div>
  );
}
