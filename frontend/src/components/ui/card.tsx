import { forwardRef } from 'react';
import { cn } from '@/lib/utils/cn';

type DivProps = React.HTMLAttributes<HTMLDivElement>;

/**
 * Paper: the surface every piece of work sits on. A hairline edge and a 4px corner,
 * like a sample card — never a rounded glass panel.
 */
export const Card = forwardRef<HTMLDivElement, DivProps>(function Card(
  { className, ...props },
  ref
) {
  return (
    <div
      ref={ref}
      className={cn(
        'rounded-[4px] border border-border bg-background text-foreground',
        'shadow-[0_1px_0_0_hsl(var(--border))]',
        className
      )}
      {...props}
    />
  );
});

export interface BentoCardProps extends DivProps {
  glow?: boolean;
}

/** @deprecated Prefer `Card`; kept so the shell and older tests keep one container API. */
export const BentoCard = forwardRef<HTMLDivElement, BentoCardProps>(function BentoCard(
  { className, glow, ...props },
  ref
) {
  return (
    <div
      ref={ref}
      className={cn(
        'group relative flex flex-col justify-between overflow-hidden rounded-[4px] border border-border bg-background',
        'shadow-[0_1px_0_0_hsl(var(--border))]',
        glow && 'border-thread/60',
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
  return <div ref={ref} className={cn('flex flex-col gap-1.5 p-5', className)} {...props} />;
});

export const CardContent = forwardRef<HTMLDivElement, DivProps>(function CardContent(
  { className, ...props },
  ref
) {
  return <div ref={ref} className={cn('p-5 pt-0', className)} {...props} />;
});

export const CardFooter = forwardRef<HTMLDivElement, DivProps>(function CardFooter(
  { className, ...props },
  ref
) {
  return <div ref={ref} className={cn('flex items-center p-5 pt-0', className)} {...props} />;
});
