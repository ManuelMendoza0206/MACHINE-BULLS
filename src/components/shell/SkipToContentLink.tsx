export function SkipToContentLink(): JSX.Element {
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:absolute focus:top-0 focus:left-0 focus:z-50 focus:p-2 focus:bg-foreground focus:text-background"
    >
      Skip to content
    </a>
  );
}
