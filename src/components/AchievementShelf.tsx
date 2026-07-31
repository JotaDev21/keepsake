import { StyleSheet, View } from 'react-native';

import { radius, spacing, useTheme, withAlpha } from '@/design';
import { ACHIEVEMENTS } from '@/lib/achievements';
import { useAchievementStore } from '@/stores/useAchievementStore';

import { Icon } from './Icon';
import { PressableScale } from './PressableScale';
import { Text } from './Text';

interface AchievementShelfProps {
  compact?: boolean;
  onOpen?: () => void;
}

export function AchievementShelf({ compact = false, onOpen }: AchievementShelfProps) {
  const theme = useTheme();
  const unlocked = useAchievementStore((state) => state.items);
  const unlockedKeys = new Set(unlocked.map((item) => item.key));
  const visible = compact
    ? ACHIEVEMENTS.filter((item) => unlockedKeys.has(item.key)).slice(-2).reverse()
    : ACHIEVEMENTS;
  const items = visible.length > 0 ? visible : ACHIEVEMENTS.slice(0, compact ? 2 : undefined);

  return (
    <View>
      <View style={styles.header}>
        <View>
          <Text variant="overline" color="textMuted">Conquistas de vocês</Text>
          <Text variant="title2" color="text" style={styles.title}>
            {unlocked.length} de {ACHIEVEMENTS.length} momentos
          </Text>
        </View>
        {onOpen ? (
          <PressableScale onPress={onOpen} accessibilityLabel="Abrir todas as conquistas" style={styles.open}>
            <Text variant="subhead" color="accent">Ver todas</Text>
            <Icon name="arrow-up-right" size={16} color="accent" />
          </PressableScale>
        ) : null}
      </View>

      <View style={styles.grid}>
        {items.map((item) => {
          const isUnlocked = unlockedKeys.has(item.key);
          return (
            <View
              key={item.key}
              style={[
                styles.tile,
                {
                  backgroundColor: isUnlocked ? theme.colors.accentSoft : theme.colors.surface,
                  borderColor: isUnlocked ? theme.colors.accentEdge : theme.colors.border,
                  experimental_backgroundImage: isUnlocked
                    ? `radial-gradient(circle at 18% 10%, ${withAlpha(theme.colors.accentBloom, 0.22)} 0%, transparent 58%)`
                    : `linear-gradient(150deg, ${theme.colors.surfaceElevated} 0%, ${theme.colors.surface} 70%)`,
                },
              ]}
            >
              <View
                style={[
                  styles.medal,
                  {
                    backgroundColor: isUnlocked ? theme.colors.accent : theme.colors.surfaceElevated,
                    borderColor: isUnlocked ? theme.colors.accentEdge : theme.colors.border,
                  },
                ]}
              >
                <Icon name={isUnlocked ? item.icon : 'lock'} size={18} color={isUnlocked ? 'onAccent' : 'textFaint'} />
              </View>
              <Text variant="callout" color={isUnlocked ? 'text' : 'textMuted'} style={styles.itemTitle}>
                {item.title}
              </Text>
              <Text variant="caption" color="textFaint" style={styles.description}>
                {item.description}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: spacing.md, marginBottom: spacing.lg },
  title: { marginTop: spacing.xs },
  open: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingVertical: spacing.sm },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  tile: {
    width: '47.8%',
    minHeight: 168,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderCurve: 'continuous',
    borderWidth: StyleSheet.hairlineWidth,
  },
  medal: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  itemTitle: { minHeight: 38 },
  description: { marginTop: spacing.xs, lineHeight: 17 },
});
