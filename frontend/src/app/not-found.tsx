import type { JSX } from 'react';
import Link from 'next/link';

export default function NotFound(): JSX.Element {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center gap-4 p-8 text-center">
      <p className="text-5xl font-bold tracking-tight">404</p>
      <h1 className="text-xl">No encontramos esta página.</h1>
      <Link href="/wardrobe" className="text-sm font-medium underline underline-offset-4">
        Ir a mi armario
      </Link>
    </div>
  );
}
