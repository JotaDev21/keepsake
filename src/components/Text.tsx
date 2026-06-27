import { Text as RNText, type TextProps as RNTextProps, type TextStyle } from 'react-native';

import { typography, useTheme, type ThemeColorToken, type TypographyVariant } from '@/design';

export interface TextProps extends RNTextProps {
  /** Type-scale variant (serif for emotion, sans for UI). */
  variant?: TypographyVariant;
  /** A theme color token (e.g. "textMuted", "accent") or any raw color string. */
  color?: ThemeColorToken | string;
  align?: TextStyle['textAlign'];
}

/**
 * The single text primitive. Everything renders through here so the two voices
 * (Newsreader / Inter) and the warm palette stay consistent.
 */
export function Text({ variant = 'body', color = 'text', align, style, ...rest }: TextProps) {
  const theme = useTheme();
  const colors = theme.colors as unknown as Record<string, string>;
  const resolved = color in colors ? colors[color] : color;

  return (
    <RNText
      style={[typography[variant], { color: resolved }, align ? { textAlign: align } : null, style]}
      {...rest}
    />
  );
}
