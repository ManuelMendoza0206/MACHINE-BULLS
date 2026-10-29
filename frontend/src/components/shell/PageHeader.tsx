import type { JSX } from 'react';

import { cn } from '@/lib/utils/cn';

export interface PageHeaderProps {
  title: string;
  description?: string;
  /** Small factual data (counts, references) shown beside the title. */
  meta?: React.ReactNode;
  /** The page's primary and secondary actions. */
  actions?: React.ReactNode;
}

/**
 * Folio header for an operate surface: title, one line of context, and the actions that
 * move the task forward. No eyebrow, no decorative section numbers.
 */
export function PageHeader({ title, description, meta, actions }: PageHeaderProps): JSX.Element {
  return (
    <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4 border-b border-border pb-5">
      <div className="min-w-0">
        <h1 className="display text-[clamp(2rem,4vw,3rem)]">{title}</h1>
        {description ? (
          <p className="mt-2 max-w-[62ch] text-sm leading-relaxed text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
      {meta || actions ? (
        <div className="flex flex-wrap items-center gap-2.5">
          {meta}
          {actions}
        </div>
      ) : null}
    </header>
  );
}
