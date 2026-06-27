import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import Animated from 'react-native-reanimated';
import { useRouter } from 'expo-router';

import { enterRise } from '@/animations';
import { Button, Chip, Icon, LightboxImage, MoodSelector, Screen, Text } from '@/components';
import { spacing, useTheme } from '@/design';
import { countdownLabel, daysUntil } from '@/lib/dates';
import { formatLongDate, greetingForHour } from '@/lib/format';
import { mediaUri } from '@/lib/media';
import { memoryOfDay } from '@/lib/memory';
import { moodColor, moodScale, startOfDay } from '@/lib/mood';
import { getWeather, type Weather } from '@/lib/weather';
import { usePersonStore } from '@/stores/usePersonStore';
import { useMediaStore } from '@/stores/useMediaStore';
import { useMoodStore } from '@/stores/useMoodStore';
import { useSyncStore } from '@/stores/useSyncStore';
import { useSpotifyStore } from '@/stores/useSpotifyStore';

const moodLabel = (key: string) => moodScale.find((m) => m.key === key)?.label ?? key;

/** Hoje — editorial daily hub: big serif, full-bleed memory, crisp sections. */
export default function HojeScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const now = new Date();

  const person = usePersonStore((s) => s.person);
  const dates = usePersonStore((s) => s.dates);
  const media = useMediaStore((s) => s.items);
  const loadMedia = useMediaStore((s) => s.load);
  const moodToday = useMoodStore((s) => s.today);
  const loadMood = useMoodStore((s) => s.load);
  const saveMood = useMoodStore((s) => s.save);
  const syncStatus = useSyncStore((s) => s.status);
  const paired = useSyncStore((s) => s.paired);
  const partnerMood = useSyncStore((s) => s.partnerMood);
  const songOfDay = useSpotifyStore((s) => s.songOfDay);
  const [weather, setWeather] = useState<Weather | null>(null);

  useEffect(() => {
    if (person) {
      loadMedia(person.id);
      loadMood(person.id);
    }
  }, [person, loadMedia, loadMood]);

  useEffect(() => {
    getWeather().then(setWeather);
  }, []);

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
        .filter((d) => d.recorrente || daysUntil(d.data, d.recorrente) >= 0)
        .sort((a, b) => daysUntil(a.data, a.recorrente) - daysUntil(b.data, b.recorrente))
        .slice(0, 3),
    [dates],
  );

  const memory = memoryOfDay(media);
  const heroHeight = width * 1.12;
  const nome = person?.nome ?? 'ela';

  return (
    <Screen scroll padded={false}>
      {/* Header */}
      <Animated.View entering={enterRise(0)} style={styles.header}>
        <Text variant="overline" color="textMuted">
          {formatLongDate(now)}
        </Text>
        <Text variant="hero" color="text" style={{ marginTop: 10 }}>
          {greetingForHour(now.getHours())}.
        </Text>
        <Text variant="serif" color="textSecondary" style={{ marginTop: 8 }}>
          Um instante pra lembrar de {nome}.
        </Text>
        {weather ? (
          <View style={styles.weather}>
            <Icon name={weather.icon} size={14} color="textMuted" />
            <Text variant="overline" color="textMuted">
              {weather.tempC}° · {weather.description}
            </Text>
          </View>
        ) : null}
      </Animated.View>

      {/* Memória do dia — full bleed */}
      <Animated.View entering={enterRise(1)} style={[styles.hero, { height: heroHeight }]}>
        {memory ? (
          <>
            <LightboxImage uri={mediaUri(memory.file)} radius={0} style={StyleSheet.absoluteFill} />
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.85)']}
              locations={[0.35, 1]}
              style={StyleSheet.absoluteFill}
              pointerEvents="none"
            />
            <View style={styles.heroText} pointerEvents="none">
              <Text variant="overline" color="accent">
                Memória do dia
              </Text>
              <Text variant="title1" color="textOnMedia" style={{ marginTop: 8 }}>
                {memory.legenda ?? 'Uma lembrança guardada.'}
              </Text>
            </View>
          </>
        ) : (
          <View style={[styles.heroEmpty, { backgroundColor: theme.colors.surface }]}>
            <Icon name="image" size={26} color="textMuted" />
            <Text variant="title2" color="textSecondary" align="center" style={{ marginTop: 14, maxWidth: 260 }}>
              O cofre ainda está em silêncio.
            </Text>
          </View>
        )}
      </Animated.View>

      <View style={styles.body}>
        {/* Humor */}
        <Animated.View entering={enterRise(2)} style={styles.section}>
          <Text variant="overline" color="textMuted" style={styles.kicker}>
            Como você está
          </Text>
          <MoodSelector options={moodScale} value={moodIndex} onChange={pickMood} />
        </Animated.View>

        {/* Partner */}
        {syncStatus === 'ready' && paired && partnerMood ? (
          <Animated.View entering={enterRise(3)} style={styles.rowSection}>
            <View>
              <Text variant="overline" color="accent">
                Hoje, {nome}
              </Text>
              <Text variant="title2" color="text" style={{ marginTop: 6 }}>
                {moodLabel(partnerMood.humor)}
              </Text>
            </View>
            <View style={[styles.moodDot, { backgroundColor: moodColor(partnerMood.humor) }]} />
          </Animated.View>
        ) : syncStatus === 'ready' && !paired ? (
          <Animated.View entering={enterRise(3)}>
            <Button
              label={`Conectar com ${nome}`}
              icon="heart"
              variant="secondary"
              size="sm"
              onPress={() => router.push('/conexao')}
              style={{ marginBottom: spacing.xxl }}
            />
          </Animated.View>
        ) : null}

        {/* Música do dia */}
        {songOfDay ? (
          <Animated.View entering={enterRise(4)} style={styles.rowSection}>
            {songOfDay.albumArt ? (
              <Image source={songOfDay.albumArt} style={styles.albumArt} contentFit="cover" transition={200} />
            ) : null}
            <View style={{ flex: 1 }}>
              <Text variant="overline" color="accent">
                Música do dia
              </Text>
              <Text variant="callout" color="text" numberOfLines={1} style={{ marginTop: 4 }}>
                {songOfDay.name}
              </Text>
              <Text variant="subhead" color="textMuted" numberOfLines={1}>
                {songOfDay.artist}
              </Text>
            </View>
            <Icon name="play" size={18} color="accent" />
          </Animated.View>
        ) : null}

        {/* Próximas datas */}
        {upcoming.length > 0 ? (
          <Animated.View entering={enterRise(5)} style={styles.section}>
            <Text variant="overline" color="textMuted" style={styles.kicker}>
              Próximas datas
            </Text>
            {upcoming.map((d) => (
              <View key={d.id} style={[styles.dateRow, { borderTopColor: theme.colors.border }]}>
                <Text variant="callout" color="text" style={{ flex: 1 }}>
                  {d.titulo}
                </Text>
                <Text variant="overline" color="accent">
                  {countdownLabel(d.data, d.recorrente)}
                </Text>
              </View>
            ))}
          </Animated.View>
        ) : null}

        {/* Ações */}
        <Animated.View entering={enterRise(6)} style={styles.actions}>
          <Chip label="Editar perfil" icon="edit-2" onPress={() => router.push('/editar-perfil')} />
          <Chip label="Cartas" icon="mail" onPress={() => router.push('/cartas')} />
          <Chip label="Música" icon="music" onPress={() => router.push('/musica')} />
        </Animated.View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: spacing.lg, marginTop: 12, marginBottom: 28 },
  weather: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 16 },
  hero: { width: '100%', overflow: 'hidden', justifyContent: 'flex-end' },
  heroText: { padding: spacing.lg },
  heroEmpty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  body: { paddingHorizontal: spacing.lg, paddingTop: 28 },
  section: { marginBottom: spacing.xxl },
  rowSection: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: spacing.xxl },
  kicker: { marginBottom: 14 },
  moodDot: { width: 20, height: 20, borderRadius: 10 },
  albumArt: { width: 52, height: 52, borderRadius: 6 },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
});
