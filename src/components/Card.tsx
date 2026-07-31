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
  /** Warm shadow. Defaults to none; featured cards float on `low`. */
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
  elevation,
  radius = radiusTokens.lg,
  glass = false,
  featured = false,
  style,
  accessibilityLabel,
}: CardProps) {
  const theme = useTheme();
  const padStyle: ViewStyle | null = padded ? { padding: theme.spacing.lg } : null;
  // Resting cards sit flat on their warm hairline; featured ones lift softly.
  const shadow = elevationTokens[elevation ?? (featured ? 'low' : 'none')];

  const inner = glass ? (
    <GlassSurface radius={radius} style={[shadow, style]}>
      <View style={padStyle}>{children}</View>
    </GlassSurface>
  ) : (
    <View
      style={[
        {
          backgroundColor: theme.colors.surface,
          experimental_backgroundImage: featured
            ? `linear-gradient(145deg, ${theme.colors.accentSoft} 0%, ${theme.colors.surface} 72%)`
            : `linear-gradient(150deg, ${theme.colors.surfaceElevated} 0%, ${theme.colors.surface} 48%, ${theme.colors.backgroundDeep} 160%)`,
          borderRadius: radius,
          borderCurve: 'continuous',
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: featured ? theme.colors.accentEdge : theme.colors.border,
        },
        shadow,
        padStyle,
        style,
      ]}
    >
      <View
        pointerEvents="none"
        style={[
          styles.topLight,
          {
            left: radius * 0.7,
            right: radius * 0.7,
            backgroundColor: featured ? theme.colors.accentEdge : theme.colors.surfaceHighlight,
          },
        ]}
      />
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

const styles = StyleSheet.create({
  topLight: {
    position: 'absolute',
    top: 0,
    height: StyleSheet.hairlineWidth,
  },
});
