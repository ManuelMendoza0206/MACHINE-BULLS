import { Suspense, type JSX } from 'react';
import { TryOnView } from '@/features/vton/components/TryOnView';

/**
 * `useSearchParams` exige un Suspense boundary para el prerender de `next build`.
 */
export default function ProbadorPage(): JSX.Element {
  return (
    <section className="mx-auto max-w-7xl p-8">
      <h1 className="text-2xl font-semibold">Probador</h1>
      <p className="mt-2 text-muted-foreground">
        Subí una foto tuya y la IA viste el outfit elegido sobre vos.
      </p>
      <div className="mt-6">
        <Suspense fallback={<Skeleton />}>
          <TryOnView />
        </Suspense>
      </div>
    </section>
  );
}

function Skeleton(): JSX.Element {
  return <div className="h-48 w-full animate-pulse rounded-lg bg-muted" aria-label="Cargando" />;
}
