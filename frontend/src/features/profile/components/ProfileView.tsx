'use client';

import { type JSX } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
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
    const msg =
      error instanceof ApiError
        ? mapStatusToUserMessage(error.status, error.responseBody)
        : 'No pudimos cargar tu perfil. ¿Está el backend levantado?';
    return (
      <div className="rounded-lg border border-border p-6 text-center">
        <p role="alert" className="text-sm text-muted-foreground">
          {msg}
        </p>
        <Button
          type="button"
          variant="secondary"
          className="mt-4"
          onClick={() => window.location.reload()}
        >
          Reintentar
        </Button>
      </div>
    );
  }

  const garments = capsule.data?.garments ?? [];
  const porPosition = garments.reduce<Record<string, number>>((acc, g) => {
    const key = g.position ?? 'sin posición';
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});
  const esteticas = [...new Set(garments.map(g => g.dominant_aesthetic))];

  return (
    <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
      <Card className="rounded-2xl sm:rounded-3xl border border-border/80 bg-background/80 shadow-xs">
        <CardHeader>
          <h2 className="text-lg font-semibold tracking-tight">Cuenta</h2>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex items-center justify-between gap-2">
            <span className="text-muted-foreground">Email</span>
            <span className="font-medium">{me?.email}</span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-muted-foreground">Usuario backend</span>
            <span className="truncate font-mono text-xs" title={me?.user_id}>
              {me?.user_id.slice(0, 8)}…
            </span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-muted-foreground">Sesión</span>
            <span>
              {authStatus === 'authenticated' ? 'Supabase activa' : 'Modo demo (público)'}
            </span>
          </div>
          <Button
            type="button"
            variant="secondary"
            className="w-full"
            onClick={() => void signOut()}
          >
            Cerrar sesión
          </Button>
        </CardContent>
      </Card>

      <Card className="rounded-2xl sm:rounded-3xl border border-border/80 bg-background/80 shadow-xs">
        <CardHeader>
          <h2 className="text-lg font-semibold tracking-tight">Tu armario</h2>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Prendas digitizadas</span>
            <span className="text-2xl font-bold">{garments.length}</span>
          </div>
          {garments.length > 0 ? (
            <>
              <ul className="space-y-1">
                {Object.entries(porPosition).map(([pos, count]) => (
                  <li key={pos} className="flex justify-between">
                    <span className="text-muted-foreground">{POSITION_LABEL[pos] ?? pos}</span>
                    <span>{count}</span>
                  </li>
                ))}
              </ul>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {esteticas.map(e => (
                  <Badge key={e} variant="outline" className="capitalize">
                    {e}
                  </Badge>
                ))}
              </div>
            </>
          ) : (
            <p className="text-muted-foreground">
              Todavía no subiste prendas — arrancá desde el armario.
            </p>
          )}
        </CardContent>
      </Card>

      <Card className="lg:col-span-2 rounded-2xl sm:rounded-3xl border border-border/80 bg-background/80 shadow-xs">
        <CardHeader>
          <h2 className="text-lg font-semibold tracking-tight">Sistema</h2>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Clasificación</span>
            <span>CLIP local · openai/clip-vit-base-patch32</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Probador VTON</span>
            <span className="font-mono" data-testid="vton-provider">
              {health.data ? health.data.vton_provider : '…'}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
