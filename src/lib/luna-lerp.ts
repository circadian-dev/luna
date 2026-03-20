/**
 * lib/luna-lerp.ts
 *
 * Color interpolation utilities for continuous lunar phase blending.
 * Identical implementation to Sol's solar-lerp.ts — copied here so Luna
 * has no runtime dependency on Sol's internal lib exports.
 */

export function lerpHex(a: string, b: string, t: number): string {
  const expand = (hex: string) =>
    hex.length === 4 ? `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}` : hex;
  const p = (hex: string) => [
    Number.parseInt(hex.slice(1, 3), 16),
    Number.parseInt(hex.slice(3, 5), 16),
    Number.parseInt(hex.slice(5, 7), 16),
  ];
  const h = (n: number) =>
    Math.round(Math.max(0, Math.min(255, n)))
      .toString(16)
      .padStart(2, '0');
  const [ar, ag, ab] = p(expand(a));
  const [br, bg, bb] = p(expand(b));
  return `#${h(ar + (br - ar) * t)}${h(ag + (bg - ag) * t)}${h(ab + (bb - ab) * t)}`;
}

export function lerpRgba(a: string, b: string, t: number): string {
  const parse = (s: string) => {
    const m = s.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
    if (!m) return [0, 0, 0, 1];
    return [+m[1], +m[2], +m[3], m[4] != null ? +m[4] : 1];
  };
  const [ar, ag, ab, aa] = parse(a);
  const [br, bg, bb, ba] = parse(b);
  return `rgba(${Math.round(ar + (br - ar) * t)},${Math.round(ag + (bg - ag) * t)},${Math.round(ab + (bb - ab) * t)},${+(aa + (ba - aa) * t).toFixed(2)})`;
}

export function lerpColor(a: string, b: string, t: number): string {
  if (t <= 0) return a;
  if (t >= 1) return b;
  if (a.startsWith('#') && b.startsWith('#')) return lerpHex(a, b, t);
  if (a.startsWith('rgb') && b.startsWith('rgb')) return lerpRgba(a, b, t);
  return a;
}
