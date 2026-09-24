import type { JSX, ReactNode } from 'react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils/cn';

export interface GarmentCardProps {
  imageUrl: string;
  category: string;
  dominantAesthetic: string;
  /** Renders the image as a toggle button when provided (capsule catalog selection). */
  selected?: boolean;
  onToggleSelect?: () => void;
  footer?: ReactNode;
  className?: string;
}

/**
 * Shared presentational card for a garment — reused by `GarmentAnalysisResult` (read view)
 * and `CapsuleCatalogGrid`. `alt` is always derived from real category/aesthetic data, per
 * `frontend-plan.md` §8 ("nunca alt=\"\" en imágenes de producto").
 */
export function GarmentCard({
  imageUrl,
  category,
  dominantAesthetic,
  selected = false,
  onToggleSelect,
  footer,
  className,
}: GarmentCardProps): JSX.Element {
  const alt = `${category}, estética ${dominantAesthetic}`;

  const image = (
    <div className="relative aspect-square w-full bg-muted">
      {/* eslint-disable-next-line @next/next/no-img-element -- processed_image_url is an
          arbitrary host (schema: z.string().url(), no host constraint) until every image
          provider is confirmed to be Cloudinary; next/image would reject anything else. */}
      <img src={imageUrl} alt={alt} className="h-full w-full object-cover" />
    </div>
  );

  return (
    <Card className={cn('overflow-hidden', selected && 'ring-2 ring-accent', className)}>
      {onToggleSelect ? (
        // 44px+ touch target: the whole image area is the control (frontend-plan.md §8).
        <button
          type="button"
          onClick={onToggleSelect}
          aria-pressed={selected}
          className="block w-full min-h-11 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          {image}
        </button>
      ) : (
        image
      )}
      <CardContent className="space-y-1.5 p-3">
        <p className="truncate text-sm font-medium capitalize">{category}</p>
        <Badge variant="outline">{dominantAesthetic}</Badge>
      </CardContent>
      {footer ? <CardFooter className="gap-2 p-3 pt-0">{footer}</CardFooter> : null}
    </Card>
  );
}
