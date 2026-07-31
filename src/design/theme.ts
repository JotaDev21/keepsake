import { palette, withAlpha, darken, darkenToContrast } from './colors';
import { spacing } from './spacing';
import { radius } from './radius';
import { typography } from './typography';
import { springs, durations, STAGGER_STEP } from './motion';
import { elevation, blur } from './elevation';

/** The two climates the app can wear. Dark-first, but daylight is welcome. */
export type ThemeMode = 'noite' | 'dia';

/**
 * Semantic colors. Components reference these names, never raw palette values,
 * so the whole app re-tints when the accent changes (per-person theming) and
 * re-lights when the mode flips between night and day.
 */
export interface ThemeColors {
  /** Behind everything — vignette / deepest layer. */
  backgroundDeep: string;
  /** Base screen background. */
  background: string;
  /** Resting surface (cards). */
  surface: string;
  /** Elevated surface (raised cards, sheets). */
  surfaceElevated: string;
  /** Subtle glass fill (over real blur, iOS). */
  glass: string;
  /** Stronger glass fill. */
  glassStrong: string;
  /** Frosted fill for platforms without GPU blur (Android) — more opaque. */
  glassFallback: string;
  /** Stronger frosted fill (Android). */
  glassFallbackStrong: string;
  /** Hairline border. */
  border: string;
  /** Stronger border. */
  borderStrong: string;
  /** Subtle top-edge highlight on raised surfaces (depth). */
  surfaceHighlight: string;
  /** Accent-tinted edge for featured surfaces. */
  accentEdge: string;
  /** Primary text. */
  text: string;
  /** Text laid over photos/media. */
  textOnMedia: string;
  /** Secondary text. */
  textSecondary: string;
  /** Muted text. */
  textMuted: string;
  /** Faint / disabled text. */
  textFaint: string;
  /** The single emotional accent (per-person, sunflower by default). */
  accent: string;
  /** The accent at full sunlight — petals, blooms, festive fills. Never text. */
  accentBloom: string;
  /** Accent at low alpha — fills, chips. */
  accentSoft: string;
  /** Accent at mid alpha — glows. */
  accentGlow: string;
  /** Text/icon color that sits on top of the accent. */
  onAccent: string;
  /** Sunflower heart — the seeded brown disc. */
  seed: string;
  /** Deeper core of the seeded disc. */
  seedDeep: string;
  /** The tiny seeds dotting the disc. */
  seedShadow: string;
  /** Natural sunflower colors. They never inherit the person's accent. */
  sunflowerPetal: string;
  sunflowerPetalDeep: string;
  sunflowerPetalLight: string;
  sunflowerStem: string;
  /** Scrim behind modals/lightbox. */
  scrim: string;
  /** Heavy overlay. */
  overlay: string;
}

export interface Theme {
  dark: boolean;
  mode: ThemeMode;
  colors: ThemeColors;
  spacing: typeof spacing;
  radius: typeof radius;
  typography: typeof typography;
  springs: typeof springs;
  durations: typeof durations;
  elevation: typeof elevation;
  blur: typeof blur;
  staggerStep: number;
}

const shared = {
  spacing,
  radius,
  typography,
  springs,
  durations,
  elevation,
  blur,
  staggerStep: STAGGER_STEP,
} as const;

/** Warm night colors (dark-first) around a single accent — candlelight, not grey. */
function nightColors(accent: string): ThemeColors {
  return {
    backgroundDeep: palette.night900,
    background: palette.night800,
    surface: palette.night700,
    surfaceElevated: palette.night600,
    glass: withAlpha(palette.ember, 0.06),
    glassStrong: withAlpha(palette.ember, 0.1),
    glassFallback: withAlpha(palette.night600, 0.78),
    glassFallbackStrong: withAlpha(palette.night600, 0.9),
    // Hairlines glow faintly amber — the warmth lives in the edges too.
    border: withAlpha(palette.ember, 0.14),
    borderStrong: withAlpha(palette.ember, 0.26),
    surfaceHighlight: withAlpha(palette.ember, 0.1),
    accentEdge: withAlpha(accent, 0.45),
    text: palette.cream,
    textOnMedia: palette.creamDim,
    textSecondary: palette.sand400,
    textMuted: palette.sand500,
    textFaint: palette.sand600,
    accent,
    accentBloom: accent,
    accentSoft: withAlpha(accent, 0.18),
    accentGlow: withAlpha(accent, 0.3),
    onAccent: '#241803',
    seed: palette.seedNight,
    seedDeep: palette.seedNightDeep,
    seedShadow: palette.seedNightShadow,
    sunflowerPetal: palette.sunflowerPetal,
    sunflowerPetalDeep: palette.sunflowerPetalDeep,
    sunflowerPetalLight: palette.sunflowerPetalLight,
    sunflowerStem: palette.stem,
    scrim: withAlpha('#170D03', 0.66),
    overlay: withAlpha(palette.night900, 0.88),
  };
}

/** Warm daylight colors around a single accent (accent deepened for cream). */
function dayColors(accent: string): ThemeColors {
  // On cream the accent wears two shades: a softly deepened one for edges and
  // glows, and a true ink — darkened until it reads at WCAG AA (≥4.5:1) on the
  // day background — wherever the accent speaks as text or paints a surface
  // that carries `onAccent` on top. `accentBloom` keeps the raw, sunlit hue
  // for the flower itself.
  const soft = darken(accent, 0.14);
  const ink = darkenToContrast(accent, palette.day50);
  return {
    backgroundDeep: palette.day100,
    background: palette.day50,
    surface: palette.daySurface,
    surfaceElevated: palette.dayElevated,
    glass: withAlpha(palette.white, 0.55),
    glassStrong: withAlpha(palette.white, 0.72),
    glassFallback: withAlpha(palette.daySurface, 0.82),
    glassFallbackStrong: withAlpha(palette.dayElevated, 0.92),
    border: withAlpha(palette.bark, 0.1),
    borderStrong: withAlpha(palette.bark, 0.18),
    surfaceHighlight: withAlpha(palette.white, 0.7),
    accentEdge: withAlpha(soft, 0.5),
    text: palette.bark,
    textOnMedia: palette.creamDim,
    textSecondary: palette.bark600,
    textMuted: palette.bark500,
    textFaint: palette.bark400,
    accent: ink,
    accentBloom: accent,
    accentSoft: withAlpha(accent, 0.2),
    accentGlow: withAlpha(soft, 0.26),
    // The ink accent is dark enough (by construction) for cream to sit on it.
    onAccent: palette.cream,
    seed: palette.seedDay,
    seedDeep: palette.seedDayDeep,
    seedShadow: palette.seedDayShadow,
    sunflowerPetal: palette.sunflowerPetal,
    sunflowerPetalDeep: palette.sunflowerPetalDeep,
    sunflowerPetalLight: palette.sunflowerPetalLight,
    sunflowerStem: palette.stem,
    scrim: withAlpha('#2A2113', 0.5),
    overlay: withAlpha('#2A2113', 0.42),
  };
}

/** Build a theme around a single accent hue, in the given climate. */
export function createTheme(accent: string = palette.sunflower, mode: ThemeMode = 'noite'): Theme {
  const dark = mode === 'noite';
  return {
    dark,
    mode,
    colors: dark ? nightColors(accent) : dayColors(accent),
    ...shared,
  };
}

export const defaultTheme: Theme = createTheme();

export type ThemeColorToken = keyof ThemeColors;
