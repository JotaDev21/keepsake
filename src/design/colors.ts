/**
 * Raw color palette + small color helpers.
 *
 * The app is warm and sunflower-themed. Two climates share one accent:
 *  - "noite" (dark-first): a deep, almost-black earth-brown — a sunflower field
 *    at night, lit from within. Never a cold pure black.
 *  - "dia" (light): a soft warm cream — the same field under sunlight.
 *
 * A single golden accent carries the emotion; it is derived per-person
 * (Person.cor_tema), and here we only define the sunflower default seed.
 *
 * Tokens are intentionally few. Restraint is the point.
 */

function clamp255(n: number): number {
  return Math.max(0, Math.min(255, Math.round(n)));
}

function toRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

function toHex(r: number, g: number, b: number): string {
  const h = (n: number) => clamp255(n).toString(16).padStart(2, '0');
  return `#${h(r)}${h(g)}${h(b)}`;
}

/** Convert "#RRGGBB" + alpha (0..1) to an rgba() string. */
export function withAlpha(hex: string, alpha: number): string {
  const [r, g, b] = toRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** Blend two hex colors: t=0 → a, t=1 → b. */
export function mix(a: string, b: string, t: number): string {
  const [r1, g1, b1] = toRgb(a);
  const [r2, g2, b2] = toRgb(b);
  return toHex(r1 + (r2 - r1) * t, g1 + (g2 - g1) * t, b1 + (b2 - b1) * t);
}

/** Darken a hex toward black by amount (0..1). */
export function darken(hex: string, amount: number): string {
  return mix(hex, '#000000', amount);
}

/** Lighten a hex toward white by amount (0..1). */
export function lighten(hex: string, amount: number): string {
  return mix(hex, '#FFFFFF', amount);
}

function srgbChannel(v: number): number {
  const c = v / 255;
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

/** WCAG relative luminance (0..1) of a "#RRGGBB" color. */
export function luminance(hex: string): number {
  const [r, g, b] = toRgb(hex);
  return 0.2126 * srgbChannel(r) + 0.7152 * srgbChannel(g) + 0.0722 * srgbChannel(b);
}

/** WCAG contrast ratio (1..21) between two "#RRGGBB" colors. */
export function contrastRatio(a: string, b: string): number {
  const la = luminance(a) + 0.05;
  const lb = luminance(b) + 0.05;
  return la > lb ? la / lb : lb / la;
}

/**
 * Darken `hex` just enough to read against `bg` at the given contrast ratio
 * (WCAG AA body text by default). Keeps the hue; only deepens it — so any
 * per-person accent stays itself, but legible.
 */
export function darkenToContrast(hex: string, bg: string, ratio = 4.5): string {
  if (contrastRatio(hex, bg) >= ratio) return hex;
  for (let amount = 0.02; amount < 1; amount += 0.02) {
    const candidate = darken(hex, amount);
    if (contrastRatio(candidate, bg) >= ratio) return candidate;
  }
  return darken(hex, 1);
}

export const palette = {
  // ---- Night ramp — a garden after sunset. Almost black, with warmth only
  // where light touches it. This avoids the muddy all-brown "sepia app". ----
  night900: '#070603',
  night800: '#0D0B07',
  night700: '#14110C',
  night600: '#1D1911',
  night500: '#30291B',

  // Warm line tint — hairlines and edges glow faintly amber, never white-grey.
  ember: '#D7A847',

  // ---- Warm cream text (over the night). ----
  cream: '#F8F3E8',
  creamDim: '#F4EAD6',
  sand400: '#CEC3AC',
  sand500: '#948873',
  sand600: '#625A4C',

  // ---- Day ramp — soft warm cream (the field under sunlight). ----
  day100: '#F1E3C6', // deepest cream (behind)
  day50: '#FAF1DC', // base background
  daySurface: '#FFFCF4', // resting surface (cards)
  dayElevated: '#FFFFFF', // elevated surface

  // ---- Warm bark text (over the day). ----
  bark: '#2A2113', // primary text
  bark600: '#4A3F2B', // secondary
  bark500: '#6E6249', // muted
  bark400: '#786C52', // faint — still AA (≥4.5:1) on the day background

  // ---- Sunflower heart — the seeded browns of the flower's center. ----
  seedNight: '#5A3F16', // the disc, lit from within
  seedNightDeep: '#33240C', // its darker core
  seedNightShadow: '#2E2009', // each tiny seed
  seedDay: '#6B4A1C', // the disc under sunlight — warmer, a touch lighter
  seedDayDeep: '#44300F',
  seedDayShadow: '#3D2B0C',

  // Default accent seed — sunflower gold. Overridden per-person.
  sunflower: '#F1B93F',
  sunflowerPetal: '#F4BF3E',
  sunflowerPetalDeep: '#D88812',
  sunflowerPetalLight: '#FFE17A',
  stem: '#6F7B3E',

  // Pure references used sparingly for scrims/shadows.
  black: '#000000',
  white: '#FFFFFF',
} as const;

/** Curated sunflower-family accents — the person's color, from gold to petal. */
export const accentPresets = [
  palette.sunflower, // girassol
  '#F0C24B', // pólen
  '#E9A421', // mel
  '#D98C4A', // âmbar
  '#E08950', // terracota
  '#C98A5A', // caramelo
  '#B9A24A', // oliva-dourado
  '#89945B', // folha
] as const;

/**
 * The mood scale's hues — deliberately spanning cool (heavy) to warm (radiant),
 * so the emotional weather reads at a glance. Kept here so every color in the
 * app lives in one place.
 */
export const moodColors = {
  pesado: '#6C7A89',
  quieto: '#7E8BA3',
  sereno: '#9FB59A',
  leve: '#E2C275',
  radiante: '#E0A86B',
  fallback: '#8C8074',
} as const;
