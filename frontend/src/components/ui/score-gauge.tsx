import type { JSX } from 'react';

export interface ScoreGaugeProps {
  label: string;
  /** 0–100. */
  value: number;
  className?: string;
}

/**
 * A measured score: ruler track, solid dye fill, thread marker at the value. The number
 * is always visible in tabular figures, so the gauge is never the only carrier of meaning.
 */
export function ScoreGauge({ label, value, className }: ScoreGaugeProps): JSX.Element {
  const pct = Math.max(0, Math.min(100, Math.round(value)));

  return (
    <div className={className}>
      <div className="flex items-baseline justify-between gap-3">
        <span className="label text-muted-foreground">{label}</span>
        <span className="num text-sm font-semibold">{pct}%</span>
      </div>
      <div
        role="img"
        aria-label={`${label}: ${pct} por ciento`}
        className="relative mt-1.5 h-3 overflow-hidden border border-border bg-muted"
      >
        <span aria-hidden="true" className="tick-rule absolute inset-0 opacity-60" />
        <span
          aria-hidden="true"
          className="absolute inset-y-0 left-0 bg-accent"
          style={{ width: `${pct}%` }}
        />
        <span
          aria-hidden="true"
          className="absolute inset-y-0 border-r-2 border-thread"
          style={{ left: `calc(${pct}% - 2px)` }}
        />
      </div>
    </div>
  );
}
