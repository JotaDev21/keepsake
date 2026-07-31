import { useEffect, useMemo } from 'react';
import { FlatList, Pressable, StyleSheet, View, type ListRenderItemInfo } from 'react-native';
import { Image } from 'expo-image';
import Animated from 'react-native-reanimated';
import { useRouter } from 'expo-router';

import { enterRise } from '@/animations';
import { EmptyState, Icon, Screen, ScreenHeader, Text, useTabBarSpace } from '@/components';
import { durations, spacing, useTheme } from '@/design';
import { formatLongDate } from '@/lib/format';
import { mediaUri } from '@/lib/media';
import { usePersonStore } from '@/stores/usePersonStore';
import { useMediaStore } from '@/stores/useMediaStore';
import type { MediaItem } from '@/types/models';

const TYPE_LABEL: Record<MediaItem['tipo'], string> = { foto: 'Foto', video: 'Vídeo', audio: 'Áudio' };

const keyExtractor = (item: MediaItem) => String(item.id);

export default function LinhaScreen() {
  const theme = useTheme();
  const router = useRouter();
  const tabSpace = useTabBarSpace();
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
        <ScreenHeader title="Linha do tempo" style={styles.header} />
        <EmptyState
          icon="clock"
          title="A história ainda não começou a ser contada."
          message="Quando você guardar memórias no cofre, elas aparecem aqui, no tempo."
        />
      </Screen>
    );
  }

  const last = items.length - 1;

  const renderItem = ({ item: m, index }: ListRenderItemInfo<MediaItem>) => {
    const when = new Date(m.dataMemoria ?? m.criadoEm);
    const thumb = m.thumbFile ?? (m.tipo === 'foto' ? m.file : null);
    return (
      <Animated.View entering={enterRise(index)} style={styles.item}>
        <View style={styles.rail}>
          <View style={[styles.dot, { borderColor: theme.colors.accentEdge }]}>
            <View style={[styles.dotCore, { backgroundColor: theme.colors.accent }]} />
          </View>
          {index < last ? <View style={[styles.line, { backgroundColor: theme.colors.border }]} /> : null}
        </View>
        <Pressable
          style={styles.content}
          onPress={() => router.push({ pathname: '/memoria/[id]', params: { id: String(m.id) } })}
        >
          <Text variant="overline" color="accent">
            {TYPE_LABEL[m.tipo]} · {formatLongDate(when)}
          </Text>
          <View
            style={[
              styles.thumb,
              {
                backgroundColor: theme.colors.surfaceElevated,
                borderColor: theme.colors.border,
                borderRadius: theme.radius.lg,
              },
              theme.elevation.low,
            ]}
          >
            <View style={[styles.thumbClip, { borderRadius: theme.radius.lg }]}>
              {thumb ? (
                <Image
                  source={mediaUri(thumb)}
                  recyclingKey={thumb}
                  style={StyleSheet.absoluteFill}
                  contentFit="cover"
                  transition={durations.fast}
                />
              ) : (
                <Icon name="music" size={26} color="textSecondary" />
              )}
            </View>
          </View>
          {m.legenda ? (
            <Text variant="serif" color="textSecondary" style={{ marginTop: spacing.md }}>
              {m.legenda}
            </Text>
          ) : null}
        </Pressable>
      </Animated.View>
    );
  };

  return (
    <Screen padded={false} tabBarPadding={false}>
      <FlatList
        data={items}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: tabSpace }}
        ListHeaderComponent={
          <ScreenHeader
            title="Linha do tempo"
            subtitle="A história, contada no tempo."
            style={styles.header}
          />
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { marginTop: spacing.sm, marginBottom: spacing.xxl },
  item: { flexDirection: 'row' },
  rail: { width: 26, alignItems: 'center' },
  dot: {
    width: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 9,
    borderWidth: StyleSheet.hairlineWidth,
    marginTop: 3,
  },
  dotCore: { width: 7, height: 7, borderRadius: 4 },
  line: { flex: 1, width: 2, marginTop: 6, borderRadius: 1 },
  content: { flex: 1, paddingBottom: spacing.xxl, paddingLeft: 6 },
  thumb: {
    width: '100%',
    height: 190,
    marginTop: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  thumbClip: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
