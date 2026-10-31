import { Suspense, type JSX } from 'react';
import Link from 'next/link';
import { TryOnView } from '@/features/vton/components/TryOnView';
import { Button } from '@/components/ui/button';
import { History } from 'lucide-react';

/**
 * `useSearchParams` exige un Suspense boundary para el prerender de `next build`.
 */
export default function ProbadorPage(): JSX.Element {
  return (
    <section className="mx-auto max-w-7xl p-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Probador</h1>
          <p className="mt-2 text-muted-foreground">
            Subí una foto tuya y la IA viste el outfit elegido sobre vos.
          </p>
        </div>
        <Button asChild variant="outline" size="sm" className="rounded-full">
          <Link href="/try-on/history">
            <History className="mr-1.5 h-4 w-4" />
            Historial de pruebas
          </Link>
        </Button>
      </div>
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
