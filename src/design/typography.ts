import type { TextStyle } from 'react-native';

/**
 * Two voices:
 *  - Newsreader (serif) for titles and emotional moments — it has soul.
 *  - Inter (sans) for the interface — quiet and legible.
 *
 * The string values must match the names registered with expo-font in the
 * root layout (see design/fonts.ts).
 */
export const fonts = {
  serif: 'Newsreader_400Regular',
  serifMedium: 'Newsreader_500Medium',
  serifSemibold: 'Newsreader_600SemiBold',
  serifItalic: 'Newsreader_400Regular_Italic',
  sans: 'Inter_400Regular',
  sansMedium: 'Inter_500Medium',
  sansSemibold: 'Inter_600SemiBold',
  sansBold: 'Inter_700Bold',
} as const;

/**
 * Type scale — "entardecer": intimate, not editorial. Titles speak close to
 * you instead of shouting from a magazine cover; the hierarchy comes from the
 * serif's warmth and generous air, not from sheer size. Line-heights breathe.
 */
export const typography = {
  hero: { fontFamily: fonts.serif, fontSize: 38, lineHeight: 46, letterSpacing: -0.4 },
  display: { fontFamily: fonts.serif, fontSize: 31, lineHeight: 39, letterSpacing: -0.3 },
  title1: { fontFamily: fonts.serifMedium, fontSize: 26, lineHeight: 33, letterSpacing: -0.2 },
  title2: { fontFamily: fonts.serifMedium, fontSize: 20, lineHeight: 27, letterSpacing: -0.1 },
  serif: { fontFamily: fonts.serif, fontSize: 18, lineHeight: 28, letterSpacing: 0 },
  quote: { fontFamily: fonts.serifItalic, fontSize: 19, lineHeight: 30, letterSpacing: 0 },
  heading: { fontFamily: fonts.sansSemibold, fontSize: 16, lineHeight: 23, letterSpacing: -0.1 },
  body: { fontFamily: fonts.sans, fontSize: 16, lineHeight: 25, letterSpacing: 0 },
  callout: { fontFamily: fonts.sansMedium, fontSize: 15, lineHeight: 22, letterSpacing: 0 },
  subhead: { fontFamily: fonts.sansMedium, fontSize: 14, lineHeight: 20, letterSpacing: 0 },
  caption: { fontFamily: fonts.sans, fontSize: 13, lineHeight: 18, letterSpacing: 0.1 },
  overline: {
    fontFamily: fonts.sansSemibold,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
  },
} satisfies Record<string, TextStyle>;

export type TypographyVariant = keyof typeof typography;
