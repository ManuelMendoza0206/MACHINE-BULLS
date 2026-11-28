'use client';

import { useCallback, useState, type FormEvent, type JSX } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { getStylistAdvice } from '@/features/outfits/api/getStylistAdvice';
import type { Outfit } from '@/schemas/api/outfits';
import { AlertCircle, Footprints, RefreshCw, Send, Sparkles, Wand2, X } from 'lucide-react';

export interface StylistAdviceModalProps {
  outfit: Outfit | null;
  occasion?: string;
  weather?: string;
  onClose: () => void;
}

interface StylistAdviceDialogProps {
  outfit: Outfit;
  occasion?: string;
  weather?: string;
  onClose: () => void;
}

function StylistAdviceDialog({
  outfit,
  occasion,
  weather,
  onClose,
}: StylistAdviceDialogProps): JSX.Element {
  const [userNote, setUserNote] = useState<string>('');
  const [submittedNote, setSubmittedNote] = useState<string | undefined>(undefined);

  const effectiveOccasion = occasion || outfit.occasion || undefined;
  const effectiveWeather = weather || outfit.weather || undefined;

  const {
    data: advice,
    isFetching: loading,
    error,
    refetch,
  } = useQuery({
    queryKey: [
      'stylist-advice',
      outfit.outfit_id,
      effectiveOccasion ?? null,
      effectiveWeather ?? null,
      submittedNote ?? '',
    ],
    queryFn: ({ signal }) =>
      getStylistAdvice(
        outfit.outfit_id,
        {
          occasion: effectiveOccasion,
          weather: effectiveWeather,
          user_note: submittedNote,
        },
        signal
      ),
    retry: false,
    staleTime: 1000 * 60 * 10,
    refetchOnWindowFocus: false,
  });

  const handleSubmitNote = useCallback(
    (e: FormEvent) => {
      e.preventDefault();
      const trimmed = userNote.trim();
      if (!trimmed || loading) return;
      if (trimmed === submittedNote) {
        void refetch();
      } else {
        setSubmittedNote(trimmed);
      }
    },
    [userNote, submittedNote, loading, refetch]
  );

  const errorMessage =
    error instanceof Error
      ? error.message
      : error
        ? 'No pudimos consultar al estilista virtual. Intenta de nuevo.'
        : null;

  const aestheticLabel = outfit.aesthetic.replace(/_/g, ' ');

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="stylist-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
    >
      <div className="relative max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-3xl border border-border bg-background p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-border/60 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-accent/15 text-accent shrink-0">
              <Wand2 className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h3 id="stylist-modal-title" className="text-base font-bold text-foreground">
                Asesor de Moda Virtual
              </h3>
              <p className="text-xs text-muted-foreground capitalize">Conjunto {aestheticLabel}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {advice && (
              <Badge
                variant="outline"
                className="border-accent/40 text-accent text-[10px] font-medium"
              >
                {advice.source === 'azure_openai'
                  ? `Azure OpenAI · ${advice.model ?? 'gpt-5-mini'}`
                  : 'Asesor local'}
              </Badge>
            )}
            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              aria-label="Cerrar asesor de moda"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="my-5 space-y-4">
          {loading ? (
            <div
              className="space-y-3"
              aria-busy="true"
              aria-label="Consultando al estilista virtual"
            >
              <Skeleton className="h-20 w-full rounded-2xl" />
              <Skeleton className="h-14 w-full rounded-2xl" />
              <Skeleton className="h-16 w-full rounded-2xl" />
              <Skeleton className="h-16 w-full rounded-2xl" />
            </div>
          ) : errorMessage ? (
            <div
              role="alert"
              className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4 space-y-3"
            >
              <div className="flex items-start gap-2.5 text-sm text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
                <p>{errorMessage}</p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void refetch()}
                className="rounded-full gap-1.5 text-xs"
              >
                <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Reintentar</span>
              </Button>
            </div>
          ) : advice ? (
            <>
              <section className="rounded-2xl border border-accent/25 bg-accent/5 p-4 space-y-1.5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-accent flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                  Por qué funciona
                </h4>
                <p className="text-xs text-foreground/90 leading-relaxed">{advice.why_it_works}</p>
              </section>

              <section className="rounded-2xl border border-border/70 bg-muted/20 p-4 space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
                  Accesorios sugeridos
                </h4>
                <div className="flex flex-wrap gap-2">
                  {advice.accessories.map((item, idx) => (
                    <Badge
                      key={`${idx}-${item}`}
                      variant="outline"
                      className="rounded-full bg-background/80 px-3 py-1 text-xs font-normal whitespace-normal text-left"
                    >
                      {item}
                    </Badge>
                  ))}
                </div>
              </section>

              <section className="rounded-2xl border border-border/70 bg-muted/20 p-4 space-y-1.5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                  <Footprints className="h-3.5 w-3.5 text-accent" aria-hidden="true" />
                  Calzado y arreglo personal
                </h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {advice.grooming_and_footwear}
                </p>
              </section>

              <section className="rounded-2xl border border-border/70 bg-muted/20 p-4 space-y-1.5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
                  Cómo adaptarlo
                </h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {advice.event_adaptation}
                </p>
              </section>
            </>
          ) : null}
        </div>

        <form onSubmit={handleSubmitNote} className="space-y-3 border-t border-border/60 pt-4">
          <label htmlFor="stylist-user-note" className="block text-xs font-medium text-foreground">
            ¿Algún detalle extra para tu ocasión? (opcional)
          </label>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              id="stylist-user-note"
              type="text"
              maxLength={300}
              value={userNote}
              onChange={e => setUserNote(e.target.value)}
              placeholder="Ej. Voy a una cena de noche, hace viento"
              className="flex-1 rounded-full border border-border bg-muted/30 px-4 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-2 focus:ring-accent"
            />
            <Button
              type="submit"
              size="sm"
              disabled={loading || userNote.trim().length === 0}
              className="rounded-full px-4 text-xs gap-1.5 shrink-0"
            >
              <Send className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Personalizar consejo</span>
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function StylistAdviceModal({
  outfit,
  occasion,
  weather,
  onClose,
}: StylistAdviceModalProps): JSX.Element | null {
  if (!outfit) return null;
  return (
    <StylistAdviceDialog
      key={outfit.outfit_id}
      outfit={outfit}
      occasion={occasion}
      weather={weather}
      onClose={onClose}
    />
  );
}
