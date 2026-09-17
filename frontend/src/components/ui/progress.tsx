import { forwardRef } from 'react';
import { cn } from '@/lib/utils/cn';

export interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  /** 0–100. Omit for an indeterminate bar. */
  value?: number;
  /** Text read by AT for the indeterminate state. */
  indeterminateLabel?: string;
}

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
      className={cn('relative h-2 w-full overflow-hidden rounded-full bg-muted', className)}
      {...props}
    >
      <div
        className={cn(
          'h-full bg-accent transition-[width]',
          indeterminate && 'w-1/3 animate-pulse'
        )}
        style={indeterminate ? undefined : { width: `${clamped}%` }}
      />
    </div>
  );
});
