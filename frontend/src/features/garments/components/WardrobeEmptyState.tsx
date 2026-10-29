'use client';

import type { JSX } from 'react';
import Link from 'next/link';
import { Card, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PhotoConsentGate } from '@/features/garments/components/PhotoConsentGate';
import { GarmentBatchUploader } from '@/features/garments/components/GarmentBatchUploader';

/**
 * Dual CTA shown when `/wardrobe` has zero garments (wardrobe-flow/spec.md §3.4) — same
 * pattern as onboarding paso 2: subir prendas propias, o empezar desde el catálogo cápsula.
 */
export function WardrobeEmptyState(): JSX.Element {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold">Tu armario todavía está vacío</h2>
          <p className="text-sm text-muted-foreground">
            Subí tus primeras prendas o empezá desde el catálogo cápsula.
          </p>
        </CardHeader>
      </Card>

      <PhotoConsentGate>
        <GarmentBatchUploader />
      </PhotoConsentGate>

      <div className="flex justify-center">
        <Button asChild variant="secondary">
          <Link href="/wardrobe/capsule">Explorar catálogo cápsula</Link>
        </Button>
      </div>
    </div>
  );
}
