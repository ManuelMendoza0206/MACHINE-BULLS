'use client';

import { useEffect, useState, type JSX } from 'react';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { GarmentCard } from '@/features/garments/components/GarmentCard';
import { useUploadGarment } from '@/features/garments/hooks/useUploadGarment';
import { updateGarment } from '@/features/garments/api/updateGarment';
import { detectBlur } from '@/lib/vision/detectBlur';
import { GarmentPositionSchema, type GarmentUploadResponse } from '@/schemas/api/garments';
import { describeGarmentError } from '@/features/garments/lib/describeGarmentError';
import { GarmentMaskEditorModal } from '@/features/garments/components/GarmentMaskEditorModal';
import { Paintbrush } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

const POSITION_LABELS: Record<string, string> = {
  top: 'Parte superior',
  bottom: 'Parte inferior',
  dress: 'Vestido / Enterizo',
  footwear: 'Calzado',
  outerwear: 'Abrigo',
  bag: 'Bolso / Mochila',
};

export interface GarmentAnalysisResultProps {
  file: File;
  /** Called with the (possibly edited) confirmed result. */
  onConfirmed: (garment: GarmentUploadResponse) => void;
  /**
   * Fires once per upload attempt (success or error), via `useUploadGarment`'s own
   * `onSettled` — so the caller can free its slot in `useUploadQueue` (spec §2.3.1: "un fallo
   * no bloquea ni cancela a los demás"). A manual retry re-fires this; freeing an already-freed
   * slot is a documented no-op on the queue engine, so that's harmless.
   */
  onSettled: () => void;
}

type PreUploadPhase = 'checking-blur' | 'blur-warning' | 'started';

/**
 * One garment photo's full analysis lifecycle (wardrobe-flow/spec.md §3.1/§3.3):
 * checking-blur → [blur-warning] → uploading → error|review → confirmed.
 * detectBlur is always informational — the warning never blocks the submit button.
 *
 * `category`/`position` are `null` until the user edits them, so the displayed value can
 * fall back to the detected one during render — this avoids syncing mutation state into local
 * state via an effect (spec still holds: editing overrides the detected value on confirm,
 * not editing keeps it).
 */
export function GarmentAnalysisResult({
  file,
  onConfirmed,
  onSettled,
}: GarmentAnalysisResultProps): JSX.Element {
  const [preUploadPhase, setPreUploadPhase] = useState<PreUploadPhase>('checking-blur');
  const [blurWarningScore, setBlurWarningScore] = useState<number | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [category, setCategory] = useState<string | null>(null);
  const [position, setPosition] = useState<string | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [adjustedImageUrl, setAdjustedImageUrl] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  // Lazy initializer — must run exactly once per mounted file, not on every render.
  const [previewUrl] = useState(() => URL.createObjectURL(file));

  const { upload, status, data, error } = useUploadGarment({ onSettled });

  // Blur check on mount — non-blocking, purely informational (spec §2.2). Reacting to an
  // external async result (image decode + Laplacian variance) is a legitimate effect, not
  // state being merely derived from other state.
  useEffect(() => {
    let cancelled = false;
    void detectBlur(file)
      .then(result => {
        if (cancelled) return;
        if (result.isBlurry) {
          setBlurWarningScore(result.varianceScore);
          setPreUploadPhase('blur-warning');
        } else {
          setPreUploadPhase('started');
          upload(file);
        }
      })
      .catch(() => {
        // detectBlur is purely informational (spec §2.2) — a decode failure (corrupt file,
        // unsupported format) must never strand the item in "checking-blur" forever. Skip
        // the check and let the real upload surface a proper, typed error if the file truly
        // is unusable.
        if (!cancelled) {
          setPreUploadPhase('started');
          upload(file);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [file, upload]);

  useEffect(() => {
    return () => URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  const uploadAnyway = (): void => {
    setPreUploadPhase('started');
    upload(file);
  };

  const retry = (): void => upload(file);

  const confirm = async (): Promise<void> => {
    if (!data || isSaving) return;
    setSaveError(null);

    const editedCategory = (category ?? data.category).trim() || data.category;
    const rawPosition = position ?? data.position ?? '';
    const parsedPosition = GarmentPositionSchema.safeParse(rawPosition);
    const editedPosition = parsedPosition.success ? parsedPosition.data : undefined;

    const categoryChanged = category !== null && editedCategory !== data.category;
    const positionChanged =
      position !== null && editedPosition !== undefined && editedPosition !== data.position;
    const maskChanged = Boolean(adjustedImageUrl);

    let nextProcessedUrl = data.processed_image_url;
    if (categoryChanged || positionChanged || maskChanged) {
      setIsSaving(true);
      try {
        const updated = await updateGarment(data.garment_id, {
          category: categoryChanged ? editedCategory : undefined,
          position: positionChanged ? editedPosition : undefined,
          processed_image_base64: adjustedImageUrl ?? undefined,
        });
        nextProcessedUrl = updated.processed_image_url;
      } catch {
        setSaveError('No pudimos guardar tus cambios en el servidor. Intenta de nuevo.');
        setIsSaving(false);
        return;
      } finally {
        setIsSaving(false);
      }
    }

    const result: GarmentUploadResponse = {
      ...data,
      category: editedCategory,
      position: editedPosition,
      processed_image_url: nextProcessedUrl,
    };
    setConfirmed(true);
    onConfirmed(result);
  };

  if (preUploadPhase === 'checking-blur') {
    return (
      <Card aria-busy="true">
        <CardContent className="p-4">
          <Skeleton className="h-40 w-full" label="Analizando tu prenda..." />
        </CardContent>
      </Card>
    );
  }

  if (preUploadPhase === 'blur-warning') {
    return (
      <Card>
        <CardContent className="space-y-3 p-4">
          {/* eslint-disable-next-line @next/next/no-img-element -- local blob: preview, next/image can't optimize it */}
          <img
            src={previewUrl}
            alt="Vista previa de la prenda"
            className="h-40 w-full rounded-md object-cover"
          />
          <Badge variant="warning">
            Foto borrosa (score {blurWarningScore?.toFixed(0)}) — ¿tomar otra?
          </Badge>
        </CardContent>
        <CardFooter className="gap-2">
          <Button type="button" onClick={uploadAnyway}>
            Subir de todas formas
          </Button>
        </CardFooter>
      </Card>
    );
  }

  // preUploadPhase === 'started' from here on — driven by the mutation's own status.

  if (confirmed && data) {
    const finalCategory = category ?? data.category;
    return (
      <GarmentCard
        imageUrl={adjustedImageUrl ?? data.processed_image_url}
        category={finalCategory}
        dominantAesthetic={data.top_aesthetics?.[0]?.aesthetic ?? 'sin clasificar'}
        footer={<Badge variant="success">Confirmada</Badge>}
      />
    );
  }

  if (status === 'error') {
    return (
      <Card>
        <CardHeader>
          <Badge variant="warning">Error al subir</Badge>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          {describeGarmentError(error)}
        </CardContent>
        <CardFooter>
          <Button type="button" variant="secondary" onClick={retry}>
            Reintentar
          </Button>
        </CardFooter>
      </Card>
    );
  }

  if (status !== 'success' || !data) {
    return (
      <Card aria-busy="true">
        <CardContent className="space-y-3 p-4">
          <Skeleton className="h-40 w-full" />
          <Progress aria-label="Analizando tu prenda..." />
          <p className="text-sm text-muted-foreground">Analizando tu prenda...</p>
        </CardContent>
      </Card>
    );
  }

  // review: status === 'success', not yet confirmed.
  const displayCategory = category ?? data.category;
  const displayPosition = position ?? data.position ?? '';
  const currentImageUrl = adjustedImageUrl ?? data.processed_image_url;
  return (
    <Card>
      <div className="relative aspect-square w-full bg-muted">
        {/* eslint-disable-next-line @next/next/no-img-element -- processed_image_url can be any host until Cloudinary is the only source */}
        <img
          src={currentImageUrl}
          alt={`${displayCategory}, resultado del análisis`}
          className="h-full w-full object-cover"
        />
        <button
          type="button"
          onClick={() => setIsEditorOpen(true)}
          className="absolute top-2 right-2 flex items-center gap-1 rounded-full bg-background/85 px-2.5 py-1 text-[10px] font-semibold text-foreground backdrop-blur-xs border border-border/60 hover:bg-background transition shadow-2xs"
          title="Ajustar recorte con brocha o borrador"
        >
          <Paintbrush className="h-3 w-3 text-accent" />
          <span>Ajustar bordes</span>
        </button>
      </div>
      <CardContent className="space-y-3 p-4">
        <label className="block text-sm font-medium">
          Categoría
          <input
            type="text"
            value={displayCategory}
            onChange={e => setCategory(e.target.value)}
            className={cn(
              'mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent'
            )}
          />
        </label>
        <label className="block text-sm font-medium">
          Posición
          <select
            value={displayPosition}
            onChange={e => setPosition(e.target.value)}
            className={cn(
              'mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent'
            )}
          >
            <option value="">Sin especificar</option>
            {GarmentPositionSchema.options.map(opt => (
              <option key={opt} value={opt}>
                {POSITION_LABELS[opt] ?? opt}
              </option>
            ))}
          </select>
        </label>
        {data.top_aesthetics && data.top_aesthetics.length > 0 ? (
          <div className="space-y-1.5">
            <p className="text-sm font-medium">Estéticas detectadas</p>
            {data.top_aesthetics.map(a => (
              <div key={a.aesthetic} className="space-y-0.5">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{a.aesthetic}</span>
                  <span>{Math.round(a.confidence * 100)}%</span>
                </div>
                <Progress value={Math.round(a.confidence * 100)} />
              </div>
            ))}
          </div>
        ) : null}
        {(data.subcategory || data.pattern) && (
          <div className="flex flex-wrap gap-1.5">
            {data.subcategory && (
              <Badge variant="outline" className="text-[11px] capitalize">
                {data.subcategory}
              </Badge>
            )}
            {data.pattern && (
              <Badge variant="outline" className="text-[11px] capitalize">
                Estampado: {data.pattern}
              </Badge>
            )}
          </div>
        )}
        <div className="flex gap-2">
          {data.dominant_colors.map(c => (
            <span
              key={c.hex}
              className="h-6 w-6 rounded-full border border-border"
              style={{ backgroundColor: c.hex }}
              title={c.hex}
            />
          ))}
        </div>
        {saveError && (
          <p role="alert" className="text-xs text-destructive">
            {saveError}
          </p>
        )}
      </CardContent>
      <CardFooter>
        <Button type="button" disabled={isSaving} onClick={() => void confirm()}>
          {isSaving ? 'Guardando...' : 'Confirmar'}
        </Button>
      </CardFooter>
      <GarmentMaskEditorModal
        isOpen={isEditorOpen}
        imageUrl={currentImageUrl}
        onClose={() => setIsEditorOpen(false)}
        onSave={newUrl => setAdjustedImageUrl(newUrl)}
      />
    </Card>
  );
}
