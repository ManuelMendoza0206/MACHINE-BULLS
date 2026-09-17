/**
 * WCAG 2.x / ISO-IEC 40500 contrast ratio between two colours.
 * Pure, no dependencies. Accepts `#rrggbb`, `#rgb`, or the same without the leading `#`.
 * Result is in [1, 21]; order of arguments does not matter.
 */
export function getContrastRatio(colorA: string, colorB: string): number {
  const lighter = Math.max(relativeLuminance(colorA), relativeLuminance(colorB));
  const darker = Math.min(relativeLuminance(colorA), relativeLuminance(colorB));
  return (lighter + 0.05) / (darker + 0.05);
}

function relativeLuminance(hex: string): number {
  const [r, g, b] = parseHex(hex).map(toLinear) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** `#rrggbb` | `rrggbb` | `#rgb` | `rgb` -> [r, g, b] in 0..255. */
function parseHex(hex: string): [number, number, number] {
  let value = hex.trim().replace(/^#/, '');
  if (value.length === 3) {
    value = value
      .split('')
      .map(c => c + c)
      .join('');
  }
  if (!/^[0-9a-fA-F]{6}$/.test(value)) {
    throw new Error(`getContrastRatio: invalid hex colour "${hex}"`);
  }
  return [
    parseInt(value.slice(0, 2), 16),
    parseInt(value.slice(2, 4), 16),
    parseInt(value.slice(4, 6), 16),
  ];
}

/** sRGB channel (0..255) -> linear-light value (0..1). */
function toLinear(channel: number): number {
  const c = channel / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}
