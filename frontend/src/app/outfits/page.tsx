import type { JSX } from 'react';
import { OutfitsView } from '@/features/outfits/components/OutfitsView';

export default function OutfitsPage(): JSX.Element {
  return (
    <section className="mx-auto max-w-7xl p-8">
      <h1 className="text-2xl font-semibold">Outfits</h1>
      <p className="mt-2 text-muted-foreground">
        Combinaciones armadas por armonía cromática y compatibilidad de estilo.
      </p>
      <div className="mt-6">
        <OutfitsView />
      </div>
    </section>
  );
}
