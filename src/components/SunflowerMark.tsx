import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/design';

interface SunflowerMarkProps {
  size?: number;
  /** Petal color — defaults to the sunlit accent (accentBloom). */
  color?: string;
  /** Center disc color — defaults to the seeded brown. */
  seedColor?: string;
  style?: StyleProp<ViewStyle>;
}

const PETALS = 8;

/**
 * The app's quiet signature: a tiny static sunflower drawn from the theme.
 * Lives beside overlines, in empty states, on the lock screen, in the tab bar —
 * wherever the app signs its name.
 */
export function SunflowerMark({ size = 18, color, seedColor, style }: SunflowerMarkProps) {
  const theme = useTheme();
  const petal = color ?? theme.colors.accentBloom;
  const seed = seedColor ?? theme.colors.seed;
  const petalW = size * 0.3;
  const petalH = size * 0.48;
  return (
    <View style={[{ width: size, height: size }, styles.root, style]} pointerEvents="none">
      {Array.from({ length: PETALS }, (_, i) => (
        <View
          key={i}
          style={{
            position: 'absolute',
            width: petalW,
            height: petalH,
            borderRadius: petalW / 2,
            backgroundColor: petal,
            transform: [{ rotate: `${(360 / PETALS) * i}deg` }, { translateY: -size * 0.26 }],
          }}
        />
      ))}
      <View
        style={{ width: size * 0.42, height: size * 0.42, borderRadius: size * 0.21, backgroundColor: seed }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { alignItems: 'center', justifyContent: 'center' },
});
