import { Feather } from '@expo/vector-icons';
import type { ComponentProps } from 'react';

import { useTheme, type ThemeColorToken } from '@/design';

export type IconName = ComponentProps<typeof Feather>['name'];

interface IconProps {
  name: IconName;
  size?: number;
  /** A theme color token or any raw color string. */
  color?: ThemeColorToken | string;
}

/** Line icons (Feather), tinted from the theme. Thin and quiet by default. */
export function Icon({ name, size = 22, color = 'text' }: IconProps) {
  const theme = useTheme();
  const colors = theme.colors as unknown as Record<string, string>;
  const resolved = color in colors ? colors[color] : color;

  return <Feather name={name} size={size} color={resolved} />;
}
