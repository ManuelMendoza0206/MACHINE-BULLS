import { forwardRef } from 'react';
import { cn } from '@/lib/utils/cn';

/** Text input on paper: hairline border, indigo caret, thread focus ring. */
export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return (
      <input
        ref={ref}
        className={cn(
          'h-11 w-full rounded-xl border border-input bg-background/80 px-3.5 text-sm text-foreground backdrop-blur-sm',
          'placeholder:text-muted-foreground/70',
          'transition-all hover:border-muted-foreground/60',
          'focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/20 focus-visible:outline-none',
          'aria-[invalid=true]:border-destructive',
          className
        )}
        {...props}
      />
    );
  }
);
