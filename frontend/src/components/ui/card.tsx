import { forwardRef } from 'react';
import { cn } from '@/lib/utils/cn';

type DivProps = React.HTMLAttributes<HTMLDivElement>;

export const Card = forwardRef<HTMLDivElement, DivProps>(function Card(
  { className, ...props },
  ref
) {
  return (
    <div
      ref={ref}
      className={cn(
        'rounded-xl border border-border bg-background text-foreground shadow-xs transition-all',
        className
      )}
      {...props}
    />
  );
});

export interface BentoCardProps extends DivProps {
  glow?: boolean;
}

export const BentoCard = forwardRef<HTMLDivElement, BentoCardProps>(function BentoCard(
  { className, glow, ...props },
  ref
) {
  return (
    <div
      ref={ref}
      className={cn(
        'group relative flex flex-col justify-between overflow-hidden rounded-2xl sm:rounded-3xl border border-border bg-background/80 backdrop-blur-md p-5 sm:p-6 shadow-xs transition-all duration-300 hover:border-accent/40 hover:shadow-md',
        glow && 'border-accent/50 ring-1 ring-accent/30 shadow-sm',
        className
      )}
      {...props}
    />
  );
});

export const CardHeader = forwardRef<HTMLDivElement, DivProps>(function CardHeader(
  { className, ...props },
  ref
) {
  return <div ref={ref} className={cn('flex flex-col gap-1.5 p-6', className)} {...props} />;
});

export const CardContent = forwardRef<HTMLDivElement, DivProps>(function CardContent(
  { className, ...props },
  ref
) {
  return <div ref={ref} className={cn('p-6 pt-0', className)} {...props} />;
});

export const CardFooter = forwardRef<HTMLDivElement, DivProps>(function CardFooter(
  { className, ...props },
  ref
) {
  return <div ref={ref} className={cn('flex items-center p-6 pt-0', className)} {...props} />;
});
