'use client';

import { useEffect } from 'react';
import type { JSX } from 'react';
import { Button } from '@/components/ui/button';

/**
 * Root error boundary. Distinguishes by `error.name` — `StyleMeError` sets
 * `name = constructor.name`, and unlike `instanceof` that survives Next's
 * server→client error serialization (app-shell/spec.md, "Manejo de errores por tipo").
 * `VtonJobTimeoutError` is handled inside the VTON flow and falls through to the generic copy here.
 */

const COPY = {
  ApiError: 'Hubo un problema con el servidor. Inténtalo de nuevo.',
  NetworkError: 'No pudimos conectarnos. Revisa tu conexión.',
  ValidationError: 'Recibimos una respuesta inesperada del servidor.',
  generic: 'Algo salió mal.',
} as const;

function messageFor(error: Error): string {
  if (error.name === 'ApiError') return COPY.ApiError;
  if (error.name === 'NetworkError') return COPY.NetworkError;
  if (error.name === 'ValidationError') return COPY.ValidationError;
  return COPY.generic;
}

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}): JSX.Element {
  useEffect(() => {
    // Real reporting (Sentry) is wired by the infra track.
    console.error(error);
  }, [error]);

  return (
    <div
      role="alert"
      className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center gap-4 p-8 text-center"
    >
      <h1 className="text-2xl font-semibold">{messageFor(error)}</h1>
      <p className="text-sm text-muted-foreground">
        Puedes reintentar. Si sigue pasando, avísanos.
      </p>
      <Button onClick={() => reset()}>Reintentar</Button>
    </div>
  );
}
