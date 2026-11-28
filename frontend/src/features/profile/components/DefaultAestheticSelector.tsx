import type { JSX } from 'react';
import { Check, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { getAestheticMeta } from '@/config/aesthetics';

export interface DefaultAestheticSelectorProps {
  value: string | null;
  onChange: (aesthetic: string | null) => void;
  availableAesthetics: string[];
}

export function DefaultAestheticSelector({
  value,
  onChange,
  availableAesthetics,
}: DefaultAestheticSelectorProps): JSX.Element {
  return (
    <div className="space-y-3">
      <div
        role="radiogroup"
        aria-label="Estética por defecto"
        className="grid grid-cols-1 sm:grid-cols-2 gap-2.5"
      >
        <button
          type="button"
          role="radio"
          aria-checked={value === null}
          onClick={() => onChange(null)}
          className={cn(
            'sm:col-span-2 flex items-start justify-between gap-3 rounded-2xl border p-3 text-left transition-all',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
            value === null
              ? 'border-accent bg-accent/10 shadow-xs'
              : 'border-border/80 bg-muted/20 hover:bg-muted/40 hover:border-border'
          )}
        >
          <div className="flex items-start gap-2.5">
            <Sparkles
              className={cn(
                'h-4 w-4 mt-0.5 shrink-0',
                value === null ? 'text-accent' : 'text-muted-foreground'
              )}
              aria-hidden="true"
            />
            <div>
              <p className="text-xs font-semibold text-foreground">Sin preferencia (equilibrado)</p>
              <p className="text-[11px] text-muted-foreground leading-snug mt-0.5">
                Deja que el recomendador combine libremente según clima y ocasión.
              </p>
            </div>
          </div>
          {value === null && (
            <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground">
              <Check className="h-3 w-3" aria-hidden="true" />
            </span>
          )}
        </button>

        {availableAesthetics.map(aesthetic => {
          const meta = getAestheticMeta(aesthetic);
          const selected = value === aesthetic;
          return (
            <button
              key={aesthetic}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(aesthetic)}
              className={cn(
                'flex items-start justify-between gap-2 rounded-2xl border p-3 text-left transition-all',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
                selected
                  ? 'border-accent bg-accent/10 shadow-xs'
                  : 'border-border/80 bg-background/70 hover:bg-muted/35 hover:border-border'
              )}
            >
              <div className="min-w-0">
                <p className="text-xs font-semibold text-foreground truncate">{meta.label}</p>
                <p className="text-[11px] text-muted-foreground leading-snug mt-0.5 line-clamp-2">
                  {meta.description}
                </p>
              </div>
              {selected && (
                <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground">
                  <Check className="h-3 w-3" aria-hidden="true" />
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
