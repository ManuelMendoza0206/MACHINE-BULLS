import type { JSX } from 'react';
/**
 * First focusable element of the document — visually hidden until focused, then jumps to
 * `<main id="main-content">` (app-shell/spec.md, "Skip link y landmark").
 */
export function SkipToContentLink(): JSX.Element {
  return (
    <a
      href="#main-content"
      className="sr-only rounded-md bg-foreground px-3 py-2 text-sm font-medium text-background focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50"
    >
      Saltar al contenido
    </a>
  );
}
