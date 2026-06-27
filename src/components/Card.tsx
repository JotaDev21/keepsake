import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { elevation as elevationTokens, radius as radiusTokens, useTheme, type ElevationToken } from '@/design';

import { GlassSurface } from './GlassSurface';
import { PressableScale } from './PressableScale';

interface CardProps {
  children: ReactNode;
  onPress?: () => void;
  onLongPress?: () => void;
  /** Inner padding (theme.spacing.lg) on by default. */
  padded?: boolean;
  elevation?: ElevationToken;
  radius?: number;
  /** Render as a glass surface instead of a solid one. */
  glass?: boolean;
  /** Accent-edged, slightly raised treatment for featured cards. */
  featured?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

/**
 * The base container. Solid warm surface by default, or glass. If `onPress` is
 * given it becomes a press-responsive card (scale + haptic).
 */
export function Card({
  children,
  onPress,
  onLongPress,
  padded = true,
  elevation = 'low',
  radius = radiusTokens.lg,
  glass = false,
  featured = false,
  style,
  accessibilityLabel,
}: CardProps) {
  const theme = useTheme();
  const padStyle: ViewStyle | null = padded ? { padding: theme.spacing.lg } : null;

  const inner = glass ? (
    <GlassSurface radius={radius} style={[elevationTokens[elevation], style]}>
      <View style={padStyle}>{children}</View>
    </GlassSurface>
  ) : (
    <View
      style={[
        {
          backgroundColor: featured ? theme.colors.surfaceElevated : theme.colors.surface,
          borderRadius: radius,
          borderWidth: featured ? 1 : StyleSheet.hairlineWidth,
          borderColor: featured ? theme.colors.accentEdge : theme.colors.border,
        },
        elevationTokens[elevation],
        padStyle,
        style,
      ]}
    >
      {children}
    </View>
  );

  if (!onPress && !onLongPress) return inner;

  return (
    <PressableScale onPress={onPress} onLongPress={onLongPress} accessibilityLabel={accessibilityLabel}>
      {inner}
    </PressableScale>
  );
}
