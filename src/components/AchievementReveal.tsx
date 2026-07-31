import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, FadeOutUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { radius, spacing, useTheme } from '@/design';
import { ACHIEVEMENTS } from '@/lib/achievements';
import { useAchievementStore } from '@/stores/useAchievementStore';

import { Icon } from './Icon';
import { PetalBurst } from './PetalBurst';
import { PressableScale } from './PressableScale';
import { Text } from './Text';

export function AchievementReveal() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const key = useAchievementStore((state) => state.newlyUnlocked);
  const clear = useAchievementStore((state) => state.clearNew);
  const [burst, setBurst] = useState(0);
  const achievement = ACHIEVEMENTS.find((item) => item.key === key);

  useEffect(() => {
    if (!key) return;
    setBurst((value) => value + 1);
    const timer = setTimeout(clear, 4400);
    return () => clearTimeout(timer);
  }, [clear, key]);

  if (!achievement) return null;

  return (
    <Animated.View
      entering={FadeInDown.springify().damping(19).stiffness(145)}
      exiting={FadeOutUp.springify().damping(22).stiffness(180)}
      style={[styles.wrap, { top: insets.top + spacing.sm }]}
    >
      <PetalBurst trigger={burst} radius={120} />
      <PressableScale
        onPress={clear}
        accessibilityLabel={`Conquista desbloqueada: ${achievement.title}`}
        style={[
          styles.card,
          theme.elevation.medium,
          {
            backgroundColor: theme.colors.surfaceElevated,
            borderColor: theme.colors.accentEdge,
            experimental_backgroundImage: `linear-gradient(120deg, ${theme.colors.accentSoft} 0%, ${theme.colors.surfaceElevated} 72%)`,
          },
        ]}
      >
        <View style={[styles.medal, { backgroundColor: theme.colors.accent }]}>
          <Icon name={achievement.icon} size={20} color="onAccent" />
        </View>
        <View style={styles.copy}>
          <Text variant="overline" color="accent">Algo floresceu</Text>
          <Text variant="callout" color="text">{achievement.title}</Text>
        </View>
        <Icon name="x" size={16} color="textFaint" />
      </PressableScale>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: spacing.lg, right: spacing.lg, zIndex: 80 },
  card: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderCurve: 'continuous',
    borderWidth: StyleSheet.hairlineWidth,
  },
  medal: { width: 44, height: 44, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1, gap: 2 },
});
