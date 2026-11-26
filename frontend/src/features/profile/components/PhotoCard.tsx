'use client';

import { useEffect, useState, type ChangeEvent, type JSX } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Camera, ShieldCheck, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  deleteCanonicalPhoto,
  getCanonicalPhoto,
  uploadCanonicalPhoto,
} from '@/features/profile/api/canonicalPhoto';
import { ApiError } from '@/lib/errors';

const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

function describeError(error: unknown): string {
  if (error instanceof ApiError) {
    const body = error.responseBody;
    if (body && typeof body === 'object' && 'detail' in body) {
      const detail = (body as { detail?: unknown }).detail;
      if (typeof detail === 'string' && detail.trim().length > 0) return detail;
    }
    if (error.status === 413) return 'La imagen supera el límite de 10 MB.';
    if (error.status === 422) {
      return 'La foto debe ser frontal, de cuerpo entero y en A-Pose (brazos y piernas separados).';
    }
    if (error.status === 401 || error.status === 403) {
      return 'Inicia sesión para guardar tu foto canónica.';
    }
  }
  return 'No pudimos guardar la foto. Revisa tu conexión e intenta de nuevo.';
}

function formatConsentDate(value: string | null | undefined): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString('es-AR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

/**
 * Foto canonica persistente: se sube una vez con consentimiento informado y el
 * probador puede reutilizarla sin pedir la imagen de nuevo. El borrado elimina
 * el archivo fisico y revoca el consentimiento en el backend.
 */
export function PhotoCard(): JSX.Element {
  const queryClient = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [consent, setConsent] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canonical = useQuery({
    queryKey: ['canonical-photo'],
    queryFn: ({ signal }) => getCanonicalPhoto(signal),
  });

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const upload = useMutation({
    mutationFn: () => {
      if (!file) throw new Error('sin archivo');
      return uploadCanonicalPhoto(file, consent);
    },
    onSuccess: response => {
      setFeedback(response.message ?? 'Foto canónica guardada.');
      setError(null);
      setFile(null);
      setConsent(false);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
      void queryClient.invalidateQueries({ queryKey: ['canonical-photo'] });
    },
    onError: uploadError => {
      setFeedback(null);
      setError(describeError(uploadError));
    },
  });

  const remove = useMutation({
    mutationFn: () => deleteCanonicalPhoto(),
    onSuccess: response => {
      setFeedback(response.message ?? 'Foto canónica eliminada.');
      setError(null);
      void queryClient.invalidateQueries({ queryKey: ['canonical-photo'] });
    },
    onError: removeError => {
      setFeedback(null);
      setError(describeError(removeError));
    },
  });

  const handleFile = (event: ChangeEvent<HTMLInputElement>): void => {
    const selected = event.currentTarget.files?.[0];
    event.currentTarget.value = '';
    if (!selected) return;

    setFeedback(null);
    setError(null);

    if (!ALLOWED_TYPES.has(selected.type)) {
      setError('Formato no soportado. Usa JPEG, PNG o WebP.');
      return;
    }
    if (selected.size > MAX_BYTES) {
      setError('La imagen supera el límite de 10 MB.');
      return;
    }

    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(selected);
    setPreviewUrl(URL.createObjectURL(selected));
  };

  const consentDate = formatConsentDate(canonical.data?.consent_at);
  const hasCanonical = Boolean(canonical.data?.has_canonical && canonical.data.photo_url);

  return (
    <Card className="rounded-3xl border border-border/80 bg-background/85 shadow-sm p-6 sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-3 pb-3 border-b border-border/60">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
            <Camera className="h-4 w-4 text-accent" />
            Foto canónica
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Súbela una vez y reutilízala en el probador sin volver a cargarla.
          </p>
        </div>
        <Badge
          variant="outline"
          className="border-accent/40 text-accent text-[10px] font-mono gap-1"
        >
          <ShieldCheck className="h-3 w-3" />
          Consentimiento explícito
        </Badge>
      </div>

      {canonical.isLoading ? (
        <Skeleton className="mt-4 h-48 w-full rounded-2xl" />
      ) : (
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="space-y-2">
            <p className="text-xs font-semibold text-foreground">Foto guardada</p>
            {hasCanonical ? (
              <div className="space-y-3">
                <div className="relative mx-auto aspect-3/4 w-full max-w-[220px] overflow-hidden rounded-2xl border border-border bg-muted">
                  {/* eslint-disable-next-line @next/next/no-img-element -- URL firmada del backend */}
                  <img
                    src={canonical.data?.photo_url ?? ''}
                    alt="Foto canónica guardada"
                    className="h-full w-full object-cover"
                  />
                </div>
                <p className="text-[11px] text-muted-foreground text-center">
                  {consentDate
                    ? `Consentimiento otorgado el ${consentDate}.`
                    : 'Consentimiento otorgado.'}
                </p>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="w-full text-xs h-9 text-destructive"
                  onClick={() => {
                    if (
                      typeof window !== 'undefined' &&
                      !window.confirm('¿Eliminar tu foto canónica y revocar el consentimiento?')
                    ) {
                      return;
                    }
                    remove.mutate();
                  }}
                  disabled={remove.isPending}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  {remove.isPending ? 'Eliminando…' : 'Eliminar foto y consentimiento'}
                </Button>
              </div>
            ) : (
              <div className="flex h-[220px] items-center justify-center rounded-2xl border border-dashed border-border bg-muted/30 px-4 text-center">
                <p className="text-xs text-muted-foreground">
                  Todavía no guardaste una foto canónica.
                </p>
              </div>
            )}
          </div>

          <div className="space-y-3">
            <p className="text-xs font-semibold text-foreground">
              {hasCanonical ? 'Reemplazar foto' : 'Subir foto'}
            </p>

            <label className="flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-2xl border border-dashed border-border bg-muted/20 px-4 py-6 text-center transition-colors hover:border-accent/50 hover:bg-accent/5">
              <Camera className="h-5 w-5 text-muted-foreground" />
              <span className="text-xs font-medium text-foreground">
                Elegir imagen (JPEG, PNG o WebP)
              </span>
              <span className="text-[11px] text-muted-foreground">
                Frontal, cuerpo entero y en A-Pose. Máx. 10 MB.
              </span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                onChange={handleFile}
              />
            </label>

            {previewUrl && (
              <div className="flex items-center gap-3 rounded-xl border border-border/70 bg-background p-2">
                {/* eslint-disable-next-line @next/next/no-img-element -- object URL local */}
                <img
                  src={previewUrl}
                  alt="Vista previa de la nueva foto canónica"
                  className="h-16 w-12 rounded-lg object-cover"
                />
                <p className="min-w-0 flex-1 truncate text-[11px] text-muted-foreground">
                  {file?.name}
                </p>
              </div>
            )}

            <label className="flex items-start gap-2 rounded-xl border border-border/70 bg-muted/20 p-3 text-[11px] leading-relaxed text-muted-foreground">
              <input
                type="checkbox"
                checked={consent}
                onChange={event => setConsent(event.currentTarget.checked)}
                className="mt-0.5 h-3.5 w-3.5 accent-accent"
              />
              <span>
                Autorizo el almacenamiento de mi foto corporal para reutilizarla en pruebas
                virtuales. Puedo eliminarla y revocar este consentimiento cuando quiera.
              </span>
            </label>

            <Button
              type="button"
              className="w-full"
              onClick={() => upload.mutate()}
              disabled={!file || !consent || upload.isPending}
            >
              {upload.isPending
                ? 'Guardando…'
                : hasCanonical
                  ? 'Reemplazar foto canónica'
                  : 'Guardar foto canónica'}
            </Button>
          </div>
        </div>
      )}

      {feedback && (
        <p role="status" className="mt-4 text-xs font-medium text-emerald-700 dark:text-emerald-400">
          {feedback}
        </p>
      )}
      {error && (
        <p role="alert" className="mt-4 text-xs font-medium text-destructive">
          {error}
        </p>
      )}
    </Card>
  );
}
