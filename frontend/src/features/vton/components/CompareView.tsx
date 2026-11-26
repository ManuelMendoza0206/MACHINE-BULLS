'use client';

import { useState, type JSX } from 'react';

export interface CompareViewProps {
  originalUrl: string;
  comparisonUrl: string;
  originalLabel: string;
  comparisonLabel: string;
}

export function CompareView({
  originalUrl,
  comparisonUrl,
  originalLabel,
  comparisonLabel,
}: CompareViewProps): JSX.Element {
  const [reveal, setReveal] = useState(50);

  return (
    <section aria-label="Comparación visual de resultados" className="space-y-3">
      <div className="relative aspect-[3/4] overflow-hidden rounded-2xl border border-border bg-muted">
        {/* eslint-disable-next-line @next/next/no-img-element -- generated media can use dynamic storage hosts */}
        <img
          src={originalUrl}
          alt={originalLabel}
          className="absolute inset-0 h-full w-full object-contain"
        />
        <div
          data-testid="comparison-reveal"
          className="absolute inset-0"
          style={{ clipPath: `inset(0 ${100 - reveal}% 0 0)` }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- generated media can use dynamic storage hosts */}
          <img src={comparisonUrl} alt={comparisonLabel} className="h-full w-full object-contain" />
        </div>
        <span className="absolute bottom-2 left-2 rounded-full bg-background/85 px-2.5 py-1 text-xs font-medium backdrop-blur">
          {comparisonLabel}
        </span>
        <span className="absolute bottom-2 right-2 rounded-full bg-background/85 px-2.5 py-1 text-xs font-medium backdrop-blur">
          {originalLabel}
        </span>
      </div>
      <label className="flex items-center gap-3 text-sm text-muted-foreground">
        <span className="shrink-0">Comparar</span>
        <input
          aria-label="Comparar resultados"
          type="range"
          min={0}
          max={100}
          value={reveal}
          onChange={event => setReveal(Number(event.currentTarget.value))}
          className="w-full accent-accent"
        />
        <span className="w-10 text-right tabular-nums">{reveal}%</span>
      </label>
    </section>
  );
}
