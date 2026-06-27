import { useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useRouter } from 'expo-router';

import { enterRise } from '@/animations';
import { Button, Card, Chip, Icon, LightboxImage, MoodSelector, Screen, Text } from '@/components';
import { useTheme } from '@/design';
import { countdownLabel, daysUntil } from '@/lib/dates';
import { formatLongDate, greetingForHour } from '@/lib/format';
import { mediaUri } from '@/lib/media';
import { memoryOfDay } from '@/lib/memory';
import { moodScale, startOfDay } from '@/lib/mood';
import { usePersonStore } from '@/stores/usePersonStore';
import { useMediaStore } from '@/stores/useMediaStore';
import { useMoodStore } from '@/stores/useMoodStore';

/** Hoje — the daily hub. The one screen that gives a reason to open the app. */
export default function HojeScreen() {
  const theme = useTheme();
  const router = useRouter();
  const now = new Date();

  const person = usePersonStore((s) => s.person);
  const dates = usePersonStore((s) => s.dates);
  const media = useMediaStore((s) => s.items);
  const loadMedia = useMediaStore((s) => s.load);
  const moodToday = useMoodStore((s) => s.today);
  const loadMood = useMoodStore((s) => s.load);
  const saveMood = useMoodStore((s) => s.save);

  useEffect(() => {
    if (person) {
      loadMedia(person.id);
      loadMood(person.id);
    }
  }, [person, loadMedia, loadMood]);

  const moodIndex = moodToday ? moodScale.findIndex((m) => m.key === moodToday.humor) : null;
  const pickMood = (i: number) => {
    if (!person) return;
    saveMood(person.id, {
      dia: startOfDay(),
      humor: moodScale[i].key,
      intensidade: moodToday?.intensidade ?? 3,
      nota: moodToday?.nota ?? null,
      tags: moodToday?.tags ?? [],
    });
  };

  const upcoming = useMemo(
    () =>
      [...dates]
        // Recurring dates always roll forward; drop only expired one-time dates.
        .filter((d) => d.recorrente || daysUntil(d.data, d.recorrente) >= 0)
        .sort((a, b) => daysUntil(a.data, a.recorrente) - daysUntil(b.data, b.recorrente))
        .slice(0, 3),
    [dates],
  );

  const memory = memoryOfDay(media);

  return (
    <Screen scroll>
      <Animated.View entering={enterRise(0)} style={styles.header}>
        <Text variant="overline" color="textMuted">
          {formatLongDate(now)}
        </Text>
        <Text variant="title1" color="text" style={{ marginTop: 6 }}>
          {greetingForHour(now.getHours())}.
        </Text>
        <Text variant="serif" color="textSecondary" style={{ marginTop: 4 }}>
          Um instante pra lembrar {person ? `de ${person.nome}` : 'dela'}.
        </Text>
      </Animated.View>

      <Animated.View entering={enterRise(1)} style={styles.section}>
        <Text variant="overline" color="accent" style={styles.kicker}>
          Memória do dia
        </Text>
        {memory ? (
          <Card padded={false} featured elevation="medium" radius={theme.radius.xl} style={styles.heroCard}>
            <LightboxImage uri={mediaUri(memory.file)} radius={theme.radius.xl} style={styles.heroImage} />
            <View style={{ padding: theme.spacing.lg }}>
              <Text variant="quote" color="text">
                {memory.legenda ?? 'Uma lembrança guardada.'}
              </Text>
            </View>
          </Card>
        ) : (
          <Card style={styles.emptyMemory}>
            <Icon name="image" size={22} color="textMuted" />
            <Text variant="serif" color="textSecondary" align="center" style={{ marginTop: 12 }}>
              Seu cofre ainda está em silêncio.
            </Text>
            <Text variant="subhead" color="textMuted" align="center" style={{ marginTop: 6 }}>
              As primeiras memórias vão aparecer aqui.
            </Text>
          </Card>
        )}
      </Animated.View>

      <Animated.View entering={enterRise(2)} style={styles.section}>
        <Text variant="heading" color="text">
          Como você está hoje?
        </Text>
        <Text variant="subhead" color="textMuted" style={{ marginTop: 4, marginBottom: 12 }}>
          Um toque pra registrar o clima de hoje.
        </Text>
        <MoodSelector options={moodScale} value={moodIndex} onChange={pickMood} />
      </Animated.View>

      {upcoming.length > 0 ? (
        <Animated.View entering={enterRise(3)} style={styles.section}>
          <Text variant="heading" color="text" style={{ marginBottom: 12 }}>
            Próximas datas
          </Text>
          <Card>
            {upcoming.map((d, i) => (
              <View
                key={d.id}
                style={[
                  styles.dateRow,
                  i === 0
                    ? null
                    : { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.colors.border },
                ]}
              >
                <View style={[styles.dateIcon, { backgroundColor: theme.colors.accentSoft }]}>
                  <Icon name="calendar" size={18} color="accent" />
                </View>
                <Text variant="callout" color="text" style={{ flex: 1 }}>
                  {d.titulo}
                </Text>
                <Text variant="subhead" color="accent">
                  {countdownLabel(d.data, d.recorrente)}
                </Text>
              </View>
            ))}
          </Card>
        </Animated.View>
      ) : null}

      <Animated.View entering={enterRise(4)} style={styles.actions}>
        <Button
          label="Editar perfil"
          icon="edit-2"
          variant="secondary"
          size="sm"
          onPress={() => router.push('/editar-perfil')}
        />
        <Button
          label="Cartas"
          icon="mail"
          variant="secondary"
          size="sm"
          onPress={() => router.push('/cartas')}
        />
      </Animated.View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { marginTop: 8, marginBottom: 24 },
  section: { marginBottom: 24 },
  kicker: { marginBottom: 10 },
  heroCard: { overflow: 'hidden' },
  heroImage: { width: '100%', aspectRatio: 4 / 3 },
  emptyMemory: { alignItems: 'center', paddingVertical: 32 },
  dateRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 14 },
  dateIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
});
