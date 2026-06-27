import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { useVideoPlayer, VideoView } from 'expo-video';
import Animated from 'react-native-reanimated';
import { useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { enterRise, fadeIn } from '@/animations';
import { AudioPlayer, BackButton, Chip, EmptyState, Icon, Text } from '@/components';
import { mediaRepo } from '@/db/repositories';
import { useTheme } from '@/design';
import { formatDate } from '@/lib/format';
import { mediaUri } from '@/lib/media';
import type { MediaItem } from '@/types/models';

/** Detalhe de memória — immersive view of a single photo / video / audio. */
export default function MemoriaDetail() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [item, setItem] = useState<MediaItem | null | undefined>(undefined);

  useEffect(() => {
    const n = Number(id);
    if (!Number.isFinite(n)) {
      setItem(null);
      return;
    }
    mediaRepo.getById(n).then(setItem).catch(() => setItem(null));
  }, [id]);

  if (item === undefined) {
    return <View style={[styles.root, { backgroundColor: theme.colors.background }]}><BackButton /></View>;
  }

  if (item === null) {
    return (
      <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
        <EmptyState icon="image" title="Memória não encontrada." />
        <BackButton />
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
      >
        <MediaView item={item} topInset={insets.top} />

        <View style={styles.body}>
          {item.dataMemoria || item.local ? (
            <Animated.View entering={enterRise(0)} style={styles.metaRow}>
              {item.dataMemoria ? <Chip label={formatDate(new Date(item.dataMemoria))} icon="clock" /> : null}
              {item.local ? <Chip label={item.local} icon="map-pin" /> : null}
            </Animated.View>
          ) : null}

          {item.legenda ? (
            <Animated.View entering={enterRise(1)}>
              <Text variant="quote" color="text" style={{ marginTop: 16 }}>
                {item.legenda}
              </Text>
            </Animated.View>
          ) : (
            <Animated.View entering={fadeIn(120)}>
              <Text variant="serif" color="textMuted" style={{ marginTop: 16 }}>
                Uma lembrança guardada.
              </Text>
            </Animated.View>
          )}
        </View>
      </Animated.ScrollView>

      <BackButton />
    </View>
  );
}

function MediaView({ item, topInset }: { item: MediaItem; topInset: number }) {
  const theme = useTheme();

  if (item.tipo === 'foto') {
    return (
      <Animated.View entering={fadeIn(0)}>
        <Image source={mediaUri(item.file)} style={styles.image} contentFit="cover" transition={250} />
      </Animated.View>
    );
  }

  if (item.tipo === 'video') {
    return <VideoBlock uri={mediaUri(item.file)} />;
  }

  return (
    <View style={[styles.audioHero, { paddingTop: topInset + 80, backgroundColor: theme.colors.surface }]}>
      <View style={[styles.audioGlyph, { backgroundColor: theme.colors.accentSoft }]}>
        <Icon name="mic" size={36} color="accent" />
      </View>
      <View style={styles.audioPlayer}>
        <AudioPlayer uri={mediaUri(item.file)} />
      </View>
    </View>
  );
}

function VideoBlock({ uri }: { uri: string }) {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = false;
  });
  return <VideoView player={player} style={styles.video} contentFit="contain" nativeControls />;
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  image: { width: '100%', height: 440 },
  video: { width: '100%', height: 440, backgroundColor: '#000' },
  audioHero: { alignItems: 'center', paddingBottom: 28 },
  audioGlyph: { width: 88, height: 88, borderRadius: 44, alignItems: 'center', justifyContent: 'center' },
  audioPlayer: { width: '100%', paddingHorizontal: 16, marginTop: 28 },
  body: { paddingHorizontal: 16, paddingTop: 20 },
  metaRow: { flexDirection: 'row', gap: 8 },
});
