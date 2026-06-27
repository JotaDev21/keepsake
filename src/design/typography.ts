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
 * Type scale. Serif for the big emotional registers (display/title/quote),
 * sans for everything functional. Line-heights are generous on purpose.
 */
export const typography = {
  hero: { fontFamily: fonts.serif, fontSize: 56, lineHeight: 60, letterSpacing: -0.8 },
  display: { fontFamily: fonts.serif, fontSize: 48, lineHeight: 54, letterSpacing: -0.6 },
  title1: { fontFamily: fonts.serifMedium, fontSize: 34, lineHeight: 40, letterSpacing: -0.4 },
  title2: { fontFamily: fonts.serifMedium, fontSize: 24, lineHeight: 30, letterSpacing: -0.2 },
  serif: { fontFamily: fonts.serif, fontSize: 19, lineHeight: 29, letterSpacing: 0 },
  quote: { fontFamily: fonts.serifItalic, fontSize: 20, lineHeight: 31, letterSpacing: 0 },
  heading: { fontFamily: fonts.sansSemibold, fontSize: 17, lineHeight: 24, letterSpacing: -0.1 },
  body: { fontFamily: fonts.sans, fontSize: 16, lineHeight: 25, letterSpacing: 0 },
  callout: { fontFamily: fonts.sansMedium, fontSize: 15, lineHeight: 22, letterSpacing: 0 },
  subhead: { fontFamily: fonts.sansMedium, fontSize: 14, lineHeight: 20, letterSpacing: 0 },
  caption: { fontFamily: fonts.sans, fontSize: 13, lineHeight: 18, letterSpacing: 0.1 },
  overline: {
    fontFamily: fonts.sansSemibold,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
} satisfies Record<string, TextStyle>;

export type TypographyVariant = keyof typeof typography;
