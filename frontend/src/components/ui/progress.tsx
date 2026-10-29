import { forwardRef } from 'react';
import { cn } from '@/lib/utils/cn';

export interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  /** 0–100. Omit for an indeterminate bar. */
  value?: number;
  /** Text read by AT for the indeterminate state. */
  indeterminateLabel?: string;
}

/**
 * A measured gauge, not a soft progress pill: the track carries a ruler and the fill
 * is a solid dye block, so a score reads as a measurement.
 */
export const Progress = forwardRef<HTMLDivElement, ProgressProps>(function Progress(
  { className, value, indeterminateLabel = 'Procesando', ...props },
  ref
) {
  const indeterminate = value === undefined || value === null;
  const clamped = indeterminate ? undefined : Math.min(100, Math.max(0, value));

  return (
    <div
      ref={ref}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={clamped}
      aria-valuetext={indeterminate ? indeterminateLabel : `${clamped}%`}
      className={cn(
        'relative h-2.5 w-full overflow-hidden border border-border bg-muted',
        className
      )}
      {...props}
    >
      <div
        className="tick-rule absolute inset-0 opacity-70"
        aria-hidden="true"
      />
      <div
        className={cn(
          'relative h-full bg-accent transition-[width] duration-700 ease-out',
          indeterminate && 'w-1/3 animate-pulse'
        )}
        style={indeterminate ? undefined : { width: `${clamped}%` }}
      />
    </div>
  );
});
