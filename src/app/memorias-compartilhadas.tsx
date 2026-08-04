import { useEffect, useMemo, useState } from 'react';
import { FlatList, StyleSheet, View, useWindowDimensions, type ListRenderItemInfo } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import Animated from 'react-native-reanimated';

import { enterRise } from '@/animations';
import { BackButton, Chip, EmptyState, Icon, PressableScale, Screen, ScreenHeader, Text } from '@/components';
import { durations, radius, spacing, useTheme } from '@/design';
import type { SharedMediaItem } from '@/lib/shared-media';
import { useSyncStore } from '@/stores/useSyncStore';

type Filter = 'todos' | 'meus' | 'parceiro';

const GAP = spacing.sm;

export default function MemoriasCompartilhadas() {
  const theme = useTheme();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const items = useSyncStore((state) => state.sharedMedia);
  const uid = useSyncStore((state) => state.uid);
  const partnerProfile = useSyncStore((state) => state.partnerProfile);
  const refresh = useSyncStore((state) => state.refreshSharedMedia);
  const [filter, setFilter] = useState<Filter>('todos');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const refreshNow = async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      await refresh();
    } finally {
      setRefreshing(false);
    }
  };

  const visible = useMemo(
    () =>
      items.filter((item) => {
        if (filter === 'meus') return item.authorId === uid;
        if (filter === 'parceiro') return item.authorId !== uid;
        return true;
      }),
    [filter, items, uid],
  );
  const tileWidth = (width - spacing.lg * 2 - GAP) / 2;
  const partnerName = partnerProfile?.displayName ?? 'Outra pessoa';

  const renderItem = ({ item, index }: ListRenderItemInfo<SharedMediaItem>) => (
    <Animated.View entering={enterRise(Math.min(index, 8))} style={{ width: tileWidth }}>
      <PressableScale
        onPress={() =>
          router.push({ pathname: '/memoria-compartilhada/[id]', params: { id: item.id } })
        }
        haptic
        style={[
          styles.tile,
          {
            width: tileWidth,
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.border,
          },
        ]}
      >
        {item.tipo === 'foto' || item.thumbUrl ? (
          <Image
            source={item.thumbUrl ?? item.fileUrl}
            style={styles.image}
            contentFit="cover"
            transition={durations.fast}
          />
        ) : (
          <View style={[styles.placeholder, { backgroundColor: theme.colors.surfaceElevated }]}>
            <Icon name={item.tipo === 'video' ? 'play' : 'mic'} size={28} color="accent" />
          </View>
        )}
        <View style={[styles.typeBadge, { backgroundColor: theme.colors.scrim }]}>
          <Icon
            name={item.tipo === 'foto' ? 'image' : item.tipo === 'video' ? 'play' : 'mic'}
            size={13}
            color="textOnMedia"
          />
        </View>
        <View style={styles.caption}>
          <Text variant="caption" color="textMuted" numberOfLines={1}>
            {item.authorId === uid ? 'Você' : partnerName}
          </Text>
          <Text variant="callout" color="text" numberOfLines={2}>
            {item.legenda || 'Uma lembrança de vocês'}
          </Text>
        </View>
      </PressableScale>
    </Animated.View>
  );

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      <Screen padded={false} edges={['top', 'bottom']} tabBarPadding={false}>
        <FlatList
          data={visible}
          numColumns={2}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          refreshing={refreshing}
          onRefresh={() => void refreshNow()}
          columnWrapperStyle={styles.row}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
          ListHeaderComponent={
            <Animated.View entering={enterRise()}>
              <ScreenHeader
                overline="Espaço compartilhado"
                title="De vocês"
                subtitle="Só o que cada um escolheu fazer atravessar."
                style={styles.header}
              />
              <View style={styles.filters}>
                <Chip label="Tudo" selected={filter === 'todos'} onPress={() => setFilter('todos')} />
                <Chip label="Você" selected={filter === 'meus'} onPress={() => setFilter('meus')} />
                <Chip label={partnerName} selected={filter === 'parceiro'} onPress={() => setFilter('parceiro')} />
              </View>
            </Animated.View>
          }
          ListEmptyComponent={
            <EmptyState
              icon="heart"
              title={filter === 'todos' ? 'Este espaço ainda está em silêncio.' : 'Nada por aqui ainda.'}
              message="Abra uma lembrança no seu cofre e toque em “Tornar nossa”."
            />
          }
        />
      </Screen>
      <BackButton />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  header: { marginTop: spacing.sm, marginBottom: spacing.lg },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.xl },
  row: { gap: GAP, marginBottom: GAP },
  tile: {
    overflow: 'hidden',
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  image: { width: '100%', aspectRatio: 0.92 },
  placeholder: { width: '100%', aspectRatio: 0.92, alignItems: 'center', justifyContent: 'center' },
  typeBadge: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    width: 28,
    height: 28,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  caption: { padding: spacing.md, gap: spacing.xs },
});
