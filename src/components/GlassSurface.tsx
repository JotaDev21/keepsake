import type { ReactNode } from 'react';
import { Platform, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';

import { radius as radiusTokens, useTheme, withAlpha, type BlurToken } from '@/design';

interface GlassSurfaceProps {
  children: ReactNode;
  /** Blur strength (iOS) — a token or raw intensity. */
  intensity?: BlurToken | number;
  radius?: number;
  /** Use the stronger translucent fill. */
  strong?: boolean;
  /** Hide the hairline border. */
  borderless?: boolean;
  style?: StyleProp<ViewStyle>;
}

const isIOS = Platform.OS === 'ios';

/**
 * Glassmorphism surface. On iOS we use a real system blur under a subtle fill.
 * On Android, expo-blur's dimezis path (SDK 56) requires a captured blur target
 * and otherwise renders nothing, so instead of a broken/empty blur we render an
 * intentional frosted surface: a more opaque fill plus a faint top sheen. The
 * intent (premium translucent depth) reads on both platforms.
 *
 * Future: wire expo-blur's BlurTargetView to get true GPU blur on Android too.
 */
export function GlassSurface({
  children,
  intensity = 'medium',
  radius = radiusTokens.lg,
  strong = false,
  borderless = false,
  style,
}: GlassSurfaceProps) {
  const theme = useTheme();
  const blurIntensity = typeof intensity === 'number' ? intensity : theme.blur[intensity];

  return (
    <View
      style={[
        {
          borderRadius: radius,
          overflow: 'hidden',
          borderWidth: borderless ? 0 : StyleSheet.hairlineWidth,
          borderColor: theme.colors.borderStrong,
        },
        style,
      ]}
    >
      {isIOS ? (
        <>
          <BlurView intensity={blurIntensity} tint="dark" style={StyleSheet.absoluteFill} />
          <View
            style={[
              StyleSheet.absoluteFill,
              { backgroundColor: strong ? theme.colors.glassStrong : theme.colors.glass },
            ]}
          />
        </>
      ) : (
        <>
          <View
            style={[
              StyleSheet.absoluteFill,
              { backgroundColor: strong ? theme.colors.glassFallbackStrong : theme.colors.glassFallback },
            ]}
          />
          <LinearGradient
            colors={[withAlpha('#FFFFFF', 0.06), 'transparent']}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />
        </>
      )}
      {children}
    </View>
  );
}
