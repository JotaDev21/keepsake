import { StyleSheet, View } from 'react-native';

import { radius, useTheme, withAlpha } from '@/design';

const SEEDS = [
  { left: '11%', top: '14%', size: 2, opacity: 0.48 },
  { left: '84%', top: '9%', size: 3, opacity: 0.34 },
  { left: '72%', top: '31%', size: 2, opacity: 0.26 },
  { left: '17%', top: '48%', size: 3, opacity: 0.2 },
  { left: '91%', top: '66%', size: 2, opacity: 0.28 },
  { left: '8%', top: '82%', size: 2, opacity: 0.2 },
] as const;

/**
 * The persistent visual climate behind every route: a dim pool of sunflower
 * light, an off-axis orbital line and a few seed-like points. It gives screens
 * atmosphere without competing with personal photos or text.
 */
export function Atmosphere() {
  const theme = useTheme();
  const glow = withAlpha(theme.colors.accentBloom, theme.dark ? 0.11 : 0.16);
  const ember = withAlpha(theme.colors.accentBloom, theme.dark ? 0.045 : 0.08);

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <View
        style={[
          StyleSheet.absoluteFill,
          {
            backgroundColor: theme.colors.background,
            experimental_backgroundImage: [
              `radial-gradient(ellipse at 84% -8%, ${glow} 0%, transparent 43%)`,
              `radial-gradient(ellipse at -12% 72%, ${ember} 0%, transparent 40%)`,
              `linear-gradient(165deg, ${theme.colors.backgroundDeep} 0%, ${theme.colors.background} 46%, ${theme.colors.backgroundDeep} 100%)`,
            ].join(','),
          },
        ]}
      />
      <View
        style={[
          styles.orbit,
          {
            borderColor: withAlpha(theme.colors.accentBloom, theme.dark ? 0.09 : 0.14),
          },
        ]}
      />
      {SEEDS.map((seed, index) => (
        <View
          key={index}
          style={{
            position: 'absolute',
            left: seed.left,
            top: seed.top,
            width: seed.size,
            height: seed.size,
            borderRadius: radius.pill,
            backgroundColor: withAlpha(theme.colors.accentBloom, seed.opacity),
          }}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  orbit: {
    position: 'absolute',
    width: 520,
    height: 520,
    top: -310,
    right: -245,
    borderRadius: 260,
    borderWidth: StyleSheet.hairlineWidth,
    transform: [{ rotate: '-18deg' }],
  },
});
