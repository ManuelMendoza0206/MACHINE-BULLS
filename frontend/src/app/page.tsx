import { LandingCta } from '@/features/auth/components/LandingCta';

export default function Home(): JSX.Element {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Hero */}
      <section className="flex flex-1 flex-col items-center justify-center px-4 py-16 text-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">StyleMe</h1>
        <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
          Digitalizá tu guardarropa, descubrí combinaciones perfectas y probate outfits con IA sobre
          tu propia foto.
        </p>
        <div className="mt-8">
          <LandingCta />
        </div>
      </section>

      {/* Propuesta de valor — 3 bloques */}
      <section className="grid gap-6 px-4 py-12 sm:grid-cols-3">
        <div className="rounded-lg border p-6 text-center">
          <h2 className="font-semibold">Guardarropa digital</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Subí tus prendas y clasificamos automáticamente categoría y estética.
          </p>
        </div>
        <div className="rounded-lg border p-6 text-center">
          <h2 className="font-semibold">Outfits inteligentes</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Recomendaciones basadas en teoría del color y compatibilidad aprendida.
          </p>
        </div>
        <div className="rounded-lg border p-6 text-center">
          <h2 className="font-semibold">Probador virtual</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Visualizá el outfit sobre tu foto en segundos con nuestro VTON.
          </p>
        </div>
      </section>
    </div>
  );
}
