import { forwardRef } from 'react';
import { cn } from '@/lib/utils/cn';

type DivProps = React.HTMLAttributes<HTMLDivElement>;

/**
 * Bento Card: The core modular compartment of StyleMe.
 * Soft 24px rounded corners (rounded-3xl), subtle glass backdrop-blur,
 * and high-contrast accessible borders.
 */
export const Card = forwardRef<HTMLDivElement, DivProps>(function Card(
  { className, ...props },
  ref
) {
  return (
    <div
      ref={ref}
      className={cn(
        'rounded-3xl border border-border/80 bg-background/80 text-foreground backdrop-blur-sm',
        'shadow-[0_4px_24px_rgba(0,0,0,0.03)] transition-all',
        className
      )}
      {...props}
    />
  );
});

export interface BentoCardProps extends DivProps {
  glow?: boolean;
}

/**
 * BentoCard: Dedicated modular compartment with hover elevation
 * and optional accent glow.
 */
export const BentoCard = forwardRef<HTMLDivElement, BentoCardProps>(function BentoCard(
  { className, glow, ...props },
  ref
) {
  return (
    <div
      ref={ref}
      className={cn(
        'group relative flex flex-col justify-between overflow-hidden rounded-3xl border border-border/80 bg-background/80 text-foreground backdrop-blur-sm',
        'shadow-[0_4px_24px_rgba(0,0,0,0.04)] transition-all hover:border-accent/40 hover:shadow-md',
        glow && 'border-accent/50 shadow-[0_0_24px_rgba(27,58,91,0.08)]',
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
