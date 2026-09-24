import type { JSX } from 'react';
import { WardrobeView } from '@/features/garments/components/WardrobeView';

export default function WardrobePage(): JSX.Element {
  return (
    <section className="mx-auto max-w-7xl p-8">
      <h1 className="text-2xl font-semibold">Armario</h1>
      <p className="mt-2 text-muted-foreground">
        Subí tus prendas o elegí del catálogo cápsula para empezar.
      </p>
      <div className="mt-6">
        <WardrobeView />
      </div>
    </section>
  );
}
