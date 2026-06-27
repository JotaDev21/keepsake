import { useEffect, useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import Animated from 'react-native-reanimated';
import { useRouter } from 'expo-router';

import { enterRise } from '@/animations';
import { EmptyState, Icon, Screen, Text } from '@/components';
import { useTheme } from '@/design';
import { formatLongDate } from '@/lib/format';
import { mediaUri } from '@/lib/media';
import { usePersonStore } from '@/stores/usePersonStore';
import { useMediaStore } from '@/stores/useMediaStore';
import type { MediaItem } from '@/types/models';

const TYPE_LABEL: Record<MediaItem['tipo'], string> = { foto: 'Foto', video: 'Vídeo', audio: 'Áudio' };

export default function LinhaScreen() {
  const theme = useTheme();
  const router = useRouter();
  const person = usePersonStore((s) => s.person);
  const media = useMediaStore((s) => s.items);
  const load = useMediaStore((s) => s.load);

  useEffect(() => {
    if (person) load(person.id);
  }, [person, load]);

  // Newest first; media is already sorted by criado_em desc, but honor dataMemoria when set.
  const items = useMemo(
    () => [...media].sort((a, b) => (b.dataMemoria ?? b.criadoEm) - (a.dataMemoria ?? a.criadoEm)),
    [media],
  );

  if (items.length === 0) {
    return (
      <Screen>
        <View style={styles.header}>
          <Text variant="title1" color="text">
            Linha do tempo
          </Text>
        </View>
        <EmptyState
          icon="clock"
          title="A história ainda não começou a ser contada."
          message="Quando você guardar memórias no cofre, elas aparecem aqui, no tempo."
        />
      </Screen>
    );
  }

  const last = items.length - 1;

  return (
    <Screen scroll>
      <View style={styles.header}>
        <Text variant="title1" color="text">
          Linha do tempo
        </Text>
        <Text variant="subhead" color="textMuted" style={{ marginTop: 2 }}>
          A história, contada no tempo.
        </Text>
      </View>

      {items.map((m, i) => {
        const when = new Date(m.dataMemoria ?? m.criadoEm);
        const thumb = m.tipo === 'foto' ? m.file : m.thumbFile;
        return (
          <Animated.View key={m.id} entering={enterRise(i)} style={styles.item}>
            <View style={styles.rail}>
              <View style={[styles.dot, { backgroundColor: theme.colors.accent }]} />
              {i < last ? <View style={[styles.line, { backgroundColor: theme.colors.border }]} /> : null}
            </View>
            <Pressable
              style={styles.content}
              onPress={() => router.push({ pathname: '/memoria/[id]', params: { id: String(m.id) } })}
            >
              <Text variant="overline" color="accent">
                {TYPE_LABEL[m.tipo]} · {formatLongDate(when)}
              </Text>
              <View
                style={[styles.thumb, { backgroundColor: theme.colors.surfaceElevated, borderRadius: theme.radius.md }]}
              >
                {thumb ? (
                  <Image source={mediaUri(thumb)} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} />
                ) : (
                  <Icon name="music" size={26} color="textSecondary" />
                )}
              </View>
              {m.legenda ? (
                <Text variant="serif" color="textSecondary" style={{ marginTop: 10 }}>
                  {m.legenda}
                </Text>
              ) : null}
            </Pressable>
          </Animated.View>
        );
      })}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { marginTop: 8, marginBottom: 24 },
  item: { flexDirection: 'row' },
  rail: { width: 26, alignItems: 'center' },
  dot: { width: 12, height: 12, borderRadius: 6, marginTop: 6 },
  line: { flex: 1, width: 2, marginTop: 6, borderRadius: 1 },
  content: { flex: 1, paddingBottom: 30, paddingLeft: 6 },
  thumb: {
    width: '100%',
    height: 190,
    overflow: 'hidden',
    marginTop: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
