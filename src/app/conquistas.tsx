import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { enterRise } from '@/animations';
import { AchievementShelf, BackButton, Card, Screen, ScreenHeader, Text } from '@/components';
import { spacing } from '@/design';
import { useAchievementStore } from '@/stores/useAchievementStore';

export default function ConquistasScreen() {
  const unlocked = useAchievementStore((state) => state.items);

  return (
    <View style={styles.root}>
      <Screen scroll contentContainerStyle={styles.content}>
        <Animated.View entering={enterRise(0)}>
          <ScreenHeader
            overline="O que já floresceu"
            title="Marcos de vocês"
            subtitle="Sem pontos, ranking ou pressão. Só momentos que passaram a existir porque os dois estavam aqui."
            mark={false}
          />
        </Animated.View>

        <Animated.View entering={enterRise(1)} style={styles.summary}>
          <Card featured>
            <Text variant="display" color="accent">{unlocked.length}</Text>
            <Text variant="serif" color="text" style={styles.summaryTitle}>
              {unlocked.length === 1 ? 'momento guardado' : 'momentos guardados'}
            </Text>
            <Text variant="subhead" color="textMuted" style={styles.summaryCopy}>
              Cada conquista aparece nos dois celulares e permanece mesmo quando um deles está sem internet.
            </Text>
          </Card>
        </Animated.View>

        <Animated.View entering={enterRise(2)}>
          <AchievementShelf />
        </Animated.View>

        <View style={styles.end}>
          <Text variant="quote" color="textMuted" align="center">
            “O importante não é completar. É ter vivido.”
          </Text>
        </View>
      </Screen>
      <BackButton />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingTop: spacing.huge },
  summary: { marginBottom: spacing.xxl },
  summaryTitle: { marginTop: spacing.xs },
  summaryCopy: { marginTop: spacing.sm, maxWidth: 310 },
  end: { paddingVertical: spacing.xxxl, paddingHorizontal: spacing.xl },
});
