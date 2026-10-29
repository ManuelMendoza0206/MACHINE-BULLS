import type { JSX } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils/cn';

/** Label-like tags: rectangular, tracked, always carrying their meaning in text. */
export const badgeVariants = cva(
  'inline-flex items-center rounded-[2px] border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em]',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-accent text-accent-foreground',
        success: 'border-transparent bg-success text-success-foreground',
        warning: 'border-transparent bg-warning text-warning-foreground',
        destructive: 'border-transparent bg-destructive text-destructive-foreground',
        thread: 'border-transparent bg-thread text-thread-foreground',
        outline: 'border-border bg-background text-foreground',
      },
    },
    defaultVariants: { variant: 'default' },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

/**
 * The visible text must carry the meaning — colour is never the sole indicator
 * (design-system/spec.md, "Accessibility compliance"). So `children` is required.
 */
export function Badge({ className, variant, children, ...props }: BadgeProps): JSX.Element {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props}>
      {children}
    </span>
  );
}
