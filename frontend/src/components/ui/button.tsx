import { forwardRef } from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils/cn';

/**
 * Buttons read like garment-label controls: rectangular, tracked, uppercase.
 * The label names the action; no icon-only button without an accessible name.
 */
export const buttonVariants = cva(
  'inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-[3px] text-[11px] font-semibold uppercase tracking-[0.12em] transition-[background-color,border-color,color,transform] duration-150 focus-visible:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-thread disabled:pointer-events-none disabled:opacity-45 active:translate-y-px',
  {
    variants: {
      variant: {
        default: 'bg-accent text-accent-foreground hover:bg-accent/90',
        secondary: 'border border-border bg-background text-foreground hover:bg-muted',
        ghost: 'text-foreground hover:bg-muted',
        outline: 'border border-foreground/35 bg-transparent text-foreground hover:bg-muted',
        thread: 'bg-thread text-thread-foreground hover:bg-thread/90',
        destructive:
          'bg-destructive text-destructive-foreground shadow-xs hover:bg-destructive/90',
      },
      size: {
        sm: 'h-8 px-3 text-[10px]',
        default: 'h-10 px-4',
        lg: 'h-12 px-6 text-xs',
        icon: 'h-10 w-10 px-0',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  /** Render as the child element (Radix `Slot`) instead of a `<button>`. */
  asChild?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant, size, asChild = false, disabled, ...props },
  ref
) {
  const Comp = asChild ? Slot : 'button';
  return (
    <Comp
      ref={ref}
      className={cn(buttonVariants({ variant, size }), className)}
      disabled={disabled}
      // Some screen readers don't announce the native attribute in every context.
      aria-disabled={disabled ? true : undefined}
      {...props}
    />
  );
});
