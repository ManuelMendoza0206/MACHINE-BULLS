import type { JSX } from 'react';
import { cn } from '@/lib/utils/cn';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Accessible label announced while loading. Defaults to a generic "Cargando". */
  label?: string;
}

/**
 * Loading placeholder. Exposes `role="status"` + `aria-busy` so assistive tech knows
 * content is pending (design-system/spec.md, "Accessibility compliance"). For a grid of
 * skeletons, prefer one wrapper with `role="status"` and pass `aria-hidden` to each item.
 */
export function Skeleton({ className, label = 'Cargando', ...props }: SkeletonProps): JSX.Element {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label={label}
      className={cn('animate-pulse rounded-md bg-muted', className)}
      {...props}
    />
  );
}
