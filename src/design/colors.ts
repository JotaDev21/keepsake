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
  // Warm near-black ramp (background → elevated surfaces).
  ink900: '#0A0807', // deepest — behind everything, vignette
  ink800: '#110E0C', // base background
  ink700: '#18130F', // resting surface (cards)
  ink600: '#211B16', // elevated surface
  ink500: '#2B241E', // strong hairline

  // Warm neutrals for text.
  bone: '#F5EFE8', // primary text — warm off-white, never pure white
  boneDim: '#E6DDD2', // primary text on busy/photo backgrounds
  stone400: '#B3A89C', // secondary text
  stone500: '#8C8074', // muted text
  stone600: '#60564D', // faint / disabled

  // Default accent seed (warm honey/amber). Overridden per-person.
  amber: '#E2A86B',

  // Pure references used sparingly for scrims/shadows.
  black: '#000000',
  white: '#FFFFFF',
} as const;
