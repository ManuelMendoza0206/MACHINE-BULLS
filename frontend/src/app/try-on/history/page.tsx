import { Suspense, type JSX } from 'react';
import Link from 'next/link';
import { VtonHistoryView } from '@/features/vton/components/VtonHistoryView';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default function VtonHistoryPage(): JSX.Element {
  return (
    <section className="mx-auto max-w-7xl p-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="h-7 text-xs px-2 -ml-2 text-muted-foreground hover:text-foreground"
            >
              <Link href="/try-on">
                <ArrowLeft className="mr-1 h-3.5 w-3.5" />
                Volver al probador
              </Link>
            </Button>
          </div>
          <h1 className="text-2xl font-semibold">Historial de pruebas virtuales</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Todas tus pruebas realizadas con IA guardadas en tu cuenta.
          </p>
        </div>
      </div>
      <div className="mt-6">
        <Suspense fallback={<Skeleton />}>
          <VtonHistoryView />
        </Suspense>
      </div>
    </section>
  );
}

function Skeleton(): JSX.Element {
  return <div className="h-48 w-full animate-pulse rounded-lg bg-muted" aria-label="Cargando" />;
}
