/**
 * True when `pathname` is `href` or a sub-route of it — e.g. `/wardrobe/upload`
 * activates the `/wardrobe` item. Trailing slashes are ignored on both sides.
 * `href` `'/'` matches only the exact root.
 */
export function isNavItemActive(pathname: string, href: string): boolean {
  const p = normalize(pathname);
  const h = normalize(href);
  if (h === '/') return p === '/';
  return p === h || p.startsWith(`${h}/`);
}

function normalize(path: string): string {
  const trimmed = path.replace(/\/+$/, '');
  return trimmed === '' ? '/' : trimmed;
}
