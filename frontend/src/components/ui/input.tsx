import { forwardRef } from 'react';
import { cn } from '@/lib/utils/cn';

/** Text input on paper: hairline border, indigo caret, thread focus ring. */
export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return (
      <input
        ref={ref}
        className={cn(
          'h-11 w-full rounded-[3px] border border-input bg-background px-3 text-sm text-foreground',
          'placeholder:text-muted-foreground/80',
          'transition-colors hover:border-muted-foreground/60',
          'focus-visible:border-accent focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-thread',
          'aria-[invalid=true]:border-destructive',
          className
        )}
        {...props}
      />
    );
  }
);
