import type { JSX } from 'react';
import { CapsuleCatalogGrid } from '@/features/garments/components/CapsuleCatalogGrid';

export default function WardrobeCapsulePage(): JSX.Element {
  return (
    <section className="mx-auto max-w-7xl p-8">
      <h1 className="text-2xl font-semibold">Catálogo cápsula</h1>
      <p className="mt-2 text-muted-foreground">
        Elegí prendas de nuestros básicos para empezar tu armario.
      </p>
      <div className="mt-6">
        <CapsuleCatalogGrid />
      </div>
    </section>
  );
}
