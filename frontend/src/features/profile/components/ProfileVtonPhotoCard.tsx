'use client';

import { useRef, useState, type JSX } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Camera, CheckCircle2, Loader2, Lock, ShieldAlert, Trash2, Upload } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from '@/components/ui/sonner';
import { useMe } from '@/features/auth/hooks/useMe';
import { GarmentDropzone } from '@/features/garments/components/GarmentDropzone';
import { PhotoConsentGate } from '@/features/garments/components/PhotoConsentGate';
import { deleteDefaultVtonPhoto, uploadDefaultVtonPhoto } from '@/features/profile/api/vtonPhoto';
import { mapStatusToUserMessage } from '@/lib/api/mapStatusToUserMessage';
import { ApiError } from '@/lib/errors';

function describeUploadError(error: unknown): string {
  if (error instanceof ApiError) {
    return mapStatusToUserMessage(error.status, error.responseBody);
  }
  return 'No pudimos guardar tu foto. Revisa tu conexión e intenta de nuevo.';
}

/**
 * Tarjeta privada en `/profile` para configurar la foto corporal por defecto del usuario
 * usada en el probador virtual (`/try-on`).
 */
export function ProfileVtonPhotoCard(): JSX.Element {
  const queryClient = useQueryClient();
  const { data: me } = useMe();
  const replaceInputRef = useRef<HTMLInputElement>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const uploadMutation = useMutation({
    mutationFn: (file: File) => uploadDefaultVtonPhoto(file),
    onSuccess: updatedMe => {
      setErrorMsg(null);
      queryClient.setQueryData(['me'], updatedMe);
      void queryClient.invalidateQueries({ queryKey: ['canonical-photo'] });
      toast.success('Foto guardada como predeterminada para tus pruebas.');
    },
    onError: err => {
      const msg = describeUploadError(err);
      setErrorMsg(msg);
      toast.error(msg);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteDefaultVtonPhoto(),
    onSuccess: updatedMe => {
      setErrorMsg(null);
      queryClient.setQueryData(['me'], updatedMe);
      void queryClient.invalidateQueries({ queryKey: ['canonical-photo'] });
      toast.success('Foto predeterminada eliminada de tu perfil.');
    },
    onError: err => {
      const msg = describeUploadError(err);
      setErrorMsg(msg);
      toast.error(msg);
    },
  });

  const handleFilesSelected = (files: File[]): void => {
    const file = files[0];
    if (!file) return;
    setErrorMsg(null);
    uploadMutation.mutate(file);
  };

  const defaultPhotoUrl = me?.default_vton_photo_url ?? null;
  const isBusy = uploadMutation.isPending || deleteMutation.isPending;

  return (
    <Card className="rounded-3xl border border-border/80 bg-background/85 shadow-sm p-6 sm:p-7 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border/60">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <Camera className="h-4 w-4 text-accent" aria-hidden="true" />
            <h2 className="text-lg font-bold tracking-tight text-foreground">
              Mi foto canónica para el probador virtual
            </h2>
            <Badge
              variant="outline"
              className="rounded-full text-[11px] font-medium gap-1 bg-muted/70"
            >
              <Lock className="h-3 w-3" aria-hidden="true" />
              Solo tuya · Privada
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed max-w-2xl">
            Sube una foto tuya frontal en postura A-Pose para usarla por defecto al probar outfits.
            Si en una prueba quieres usar otra foto distinta, podrás hacerlo puntualmente sin
            sobrescribir esta.
          </p>
        </div>
      </div>

      <PhotoConsentGate variant="vton">
        <div className="space-y-4">
          {defaultPhotoUrl ? (
            <div className="grid grid-cols-1 sm:grid-cols-[200px_1fr] gap-5 items-center">
              <div className="relative aspect-[3/4] w-full max-w-[200px] overflow-hidden rounded-2xl border border-border bg-muted/50 mx-auto sm:mx-0">
                {/* eslint-disable-next-line @next/next/no-img-element -- URL del backend o blob */}
                <img
                  src={defaultPhotoUrl}
                  alt="Tu foto por defecto para el probador virtual"
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="space-y-3">
                <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-300">
                  <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Foto por defecto activa</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Cuando entres a <strong>Probador</strong> desde cualquier outfit, esta foto se
                  cargará automáticamente para que generes la prueba con un solo clic.
                </p>
                <div className="flex flex-wrap gap-2 pt-1">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled={isBusy}
                    onClick={() => replaceInputRef.current?.click()}
                    className="rounded-full text-xs gap-1.5"
                  >
                    {uploadMutation.isPending ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                    ) : (
                      <Upload className="h-3.5 w-3.5" aria-hidden="true" />
                    )}
                    <span>
                      {uploadMutation.isPending ? 'Validando postura…' : 'Cambiar foto guardada'}
                    </span>
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isBusy}
                    onClick={() => deleteMutation.mutate()}
                    className="rounded-full text-xs gap-1.5 border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
                  >
                    {deleteMutation.isPending ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                    )}
                    <span>Eliminar foto guardada</span>
                  </Button>
                  <input
                    ref={replaceInputRef}
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    aria-label="Cambiar foto corporal guardada"
                    onChange={e => {
                      const file = e.target.files?.[0];
                      if (file) handleFilesSelected([file]);
                      e.target.value = '';
                    }}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <GarmentDropzone
                multiple={false}
                disabled={isBusy}
                onFilesSelected={handleFilesSelected}
                title={
                  uploadMutation.isPending
                    ? 'Validando y guardando tu foto…'
                    : 'Sube tu foto base de cuerpo completo'
                }
                subtitle="De frente, cuerpo entero y brazos ligeramente separados (postura A-Pose)"
                badgeText="JPG, PNG, WEBP · 1 foto privada"
                inputAriaLabel="Seleccionar foto corporal por defecto"
                className="md:min-h-[220px] lg:min-h-[240px]"
              />
            </div>
          )}

          {errorMsg && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-2xl border border-destructive/40 bg-destructive/10 p-3.5 text-xs text-destructive"
            >
              <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
              <div className="space-y-1">
                <p className="font-semibold">No se pudo guardar la foto</p>
                <p>{errorMsg}</p>
              </div>
            </div>
          )}
        </div>
      </PhotoConsentGate>
    </Card>
  );
}
