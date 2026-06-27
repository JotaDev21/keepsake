import { palette, withAlpha } from './colors';
import { spacing } from './spacing';
import { radius } from './radius';
import { typography } from './typography';
import { springs, durations, STAGGER_STEP } from './motion';
import { elevation, blur } from './elevation';

/**
 * Semantic colors. Components reference these names, never raw palette values,
 * so the whole app re-tints when the accent changes (per-person theming).
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
  /** The single emotional accent (per-person). */
  accent: string;
  /** Accent at low alpha — fills, chips. */
  accentSoft: string;
  /** Accent at mid alpha — glows. */
  accentGlow: string;
  /** Text/icon color that sits on top of the accent. */
  onAccent: string;
  /** Scrim behind modals/lightbox. */
  scrim: string;
  /** Heavy overlay. */
  overlay: string;
}

export interface Theme {
  dark: boolean;
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

/** Build a theme around a single accent hue. Dark-first, always. */
export function createTheme(accent: string = palette.amber): Theme {
  return {
    dark: true,
    colors: {
      backgroundDeep: palette.ink900,
      background: palette.ink800,
      surface: palette.ink700,
      surfaceElevated: palette.ink600,
      glass: withAlpha(palette.white, 0.045),
      glassStrong: withAlpha(palette.white, 0.075),
      glassFallback: withAlpha(palette.ink600, 0.72),
      glassFallbackStrong: withAlpha(palette.ink600, 0.85),
      border: withAlpha(palette.white, 0.07),
      borderStrong: withAlpha(palette.white, 0.12),
      surfaceHighlight: withAlpha(palette.white, 0.06),
      accentEdge: withAlpha(accent, 0.45),
      text: palette.bone,
      textOnMedia: palette.boneDim,
      textSecondary: palette.stone400,
      textMuted: palette.stone500,
      textFaint: palette.stone600,
      accent,
      accentSoft: withAlpha(accent, 0.16),
      accentGlow: withAlpha(accent, 0.3),
      onAccent: '#1B1206',
      scrim: withAlpha(palette.black, 0.62),
      overlay: withAlpha(palette.ink900, 0.86),
    },
    spacing,
    radius,
    typography,
    springs,
    durations,
    elevation,
    blur,
    staggerStep: STAGGER_STEP,
  };
}

export const defaultTheme: Theme = createTheme();

export type ThemeColorToken = keyof ThemeColors;
