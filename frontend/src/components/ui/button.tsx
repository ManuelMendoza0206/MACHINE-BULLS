import { forwardRef } from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils/cn';

/**
 * Buttons read like garment-label controls: rectangular, tracked, uppercase.
 * The label names the action; no icon-only button without an accessible name.
 */
export const buttonVariants = cva(
  'inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-45 active:scale-[0.98]',
  {
    variants: {
      variant: {
        default: 'bg-accent text-accent-foreground shadow-xs hover:bg-accent/90',
        secondary:
          'border border-border/80 bg-background/80 text-foreground backdrop-blur-sm hover:bg-muted',
        ghost: 'text-foreground hover:bg-muted/70',
        outline: 'border border-border bg-transparent text-foreground hover:bg-muted/60',
        thread: 'bg-thread text-thread-foreground shadow-xs hover:bg-thread/90',
        destructive: 'bg-destructive text-destructive-foreground shadow-xs hover:bg-destructive/90',
      },
      size: {
        sm: 'h-8 rounded-lg px-3 text-xs',
        default: 'h-10 px-4',
        lg: 'h-12 rounded-2xl px-6 text-base',
        icon: 'h-10 w-10 p-0',
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
