/**
 * Raw color palette + small color helpers.
 *
 * The app is dark-first and warm: backgrounds are a deep, almost-black brown
 * (never a cold pure black) so the surface feels like dim light rather than a
 * void. A single accent carries the emotion; it is derived per-person later
 * (Person.cor_tema), and here we only define the gentle default seed.
 *
 * Tokens are intentionally few. Restraint is the point.
 */

/** Convert "#RRGGBB" + alpha (0..1) to an rgba() string. */
export function withAlpha(hex: string, alpha: number): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export const palette = {
  // Editorial near-pure-black ramp — neutral, high contrast, dramatic.
  ink900: '#000000', // true black — behind everything
  ink800: '#080808', // base background
  ink700: '#131313', // resting surface (cards)
  ink600: '#1C1C1C', // elevated surface
  ink500: '#2A2A2A', // strong hairline

  // High-contrast near-white text.
  bone: '#FBFBF9', // primary text
  boneDim: '#EDEDEA', // primary text over media
  stone400: '#BDBBB6', // secondary text
  stone500: '#8B8985', // muted text
  stone600: '#585652', // faint / disabled

  // Default accent seed (warm honey/amber). Overridden per-person.
  amber: '#E2A86B',

  // Pure references used sparingly for scrims/shadows.
  black: '#000000',
  white: '#FFFFFF',
} as const;
