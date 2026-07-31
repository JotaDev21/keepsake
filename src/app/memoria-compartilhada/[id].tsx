import { useEffect, useMemo, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { enterRise, fadeIn } from '@/animations';
import { AudioPlayer, BackButton, Button, Chip, EmptyState, Icon, Text } from '@/components';
import { durations, spacing, useTheme } from '@/design';
import { formatDate } from '@/lib/format';
import { haptics } from '@/lib/haptics';
import type { SharedMediaItem } from '@/lib/shared-media';
import { useMediaStore } from '@/stores/useMediaStore';
import { usePersonStore } from '@/stores/usePersonStore';
import { useSyncStore } from '@/stores/useSyncStore';

export default function MemoriaCompartilhadaDetail() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const items = useSyncStore((state) => state.sharedMedia);
  const uid = useSyncStore((state) => state.uid);
  const partnerProfile = useSyncStore((state) => state.partnerProfile);
  const refresh = useSyncStore((state) => state.refreshSharedMedia);
  const setMediaShared = useSyncStore((state) => state.setMediaShared);
  const localMedia = useMediaStore((state) => state.items);
  const loadLocalMedia = useMediaStore((state) => state.load);
  const saveSharedCopy = useMediaStore((state) => state.saveSharedCopy);
  const person = usePersonStore((state) => state.person);
  const [loading, setLoading] = useState(false);

  const item = useMemo(() => items.find((candidate) => candidate.id === id) ?? null, [id, items]);
  const localItem = useMemo(
    () => localMedia.find((candidate) => candidate.remoteId === id) ?? null,
    [id, localMedia],
  );

  useEffect(() => {
    if (!item) void refresh();
  }, [item, refresh]);

  useEffect(() => {
    if (person) void loadLocalMedia(person.id);
  }, [loadLocalMedia, person]);

  const makePrivate = () => {
    if (!localItem || loading) return;
    Alert.alert(
      'Voltar a ser só sua?',
      'A outra pessoa deixa de ver esta lembrança. A cópia neste celular continua intacta.',
      [
        { text: 'Manter de vocês', style: 'cancel' },
        {
          text: 'Deixar privada',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              setLoading(true);
              const result = await setMediaShared(localItem.id, false);
              setLoading(false);
              if (!result.ok) {
                Alert.alert('Não foi possível', result.message);
                return;
              }
              haptics.success();
              router.back();
            })();
          },
        },
      ],
    );
  };

  if (!item) {
    return (
      <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
        <EmptyState icon="image" title="Memória não encontrada." message="Talvez tenha voltado a ser privada." />
        <BackButton />
      </View>
    );
  }

  const isAuthor = item.authorId === uid;
  const author = isAuthor
    ? 'Você escolheu compartilhar'
    : `${partnerProfile?.displayName ?? 'A outra pessoa'} compartilhou`;

  const saveToVault = async () => {
    if (!person || loading || localItem) return;
    setLoading(true);
    try {
      await saveSharedCopy(person.id, item);
      haptics.success();
    } catch (error) {
      console.warn('memory ev: cópia compartilhada não foi salva', error);
      Alert.alert('Não foi possível salvar', 'Confira a conexão e tente de novo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: insets.top + spacing.huge,
          paddingBottom: insets.bottom + spacing.xxxl,
        }}
      >
        <Animated.View
          entering={fadeIn(0)}
          style={[
            styles.frame,
            {
              borderColor: theme.colors.border,
              backgroundColor: theme.colors.surface,
              borderRadius: theme.radius.xl,
            },
            theme.elevation.low,
          ]}
        >
          <View style={[styles.clip, { borderRadius: theme.radius.xl }]}>
            <SharedMediaView item={item} />
          </View>
        </Animated.View>

        <View style={styles.body}>
          <Animated.View entering={enterRise(0)}>
            <Text variant="overline" color="accent">
              {author}
            </Text>
          </Animated.View>

          {item.dataMemoria || item.local ? (
            <Animated.View entering={enterRise(1)} style={styles.meta}>
              {item.dataMemoria ? <Chip label={formatDate(new Date(item.dataMemoria))} icon="clock" /> : null}
              {item.local ? <Chip label={item.local} icon="map-pin" /> : null}
            </Animated.View>
          ) : null}

          <Animated.View entering={enterRise(2)}>
            <Text variant="quote" color={item.legenda ? 'text' : 'textMuted'} style={styles.caption}>
              {item.legenda || 'Uma lembrança de vocês.'}
            </Text>
          </Animated.View>

          {isAuthor && localItem ? (
            <Animated.View entering={enterRise(3)}>
              <Button
                label="Voltar a ser só minha"
                icon="lock"
                variant="secondary"
                fullWidth
                loading={loading}
                onPress={makePrivate}
                style={styles.privateButton}
              />
            </Animated.View>
          ) : !isAuthor ? (
            <Animated.View entering={enterRise(3)}>
              <Button
                label={localItem ? 'Guardada no seu cofre' : 'Salvar no meu cofre'}
                icon={localItem ? 'check' : 'download'}
                variant="secondary"
                fullWidth
                loading={loading}
                disabled={Boolean(localItem)}
                onPress={() => void saveToVault()}
                style={styles.privateButton}
              />
              <Text variant="caption" color="textFaint" align="center" style={styles.savedHint}>
                A cópia salva continua no aparelho mesmo se a versão compartilhada for removida.
              </Text>
            </Animated.View>
          ) : null}
        </View>
      </Animated.ScrollView>
      <BackButton />
    </View>
  );
}

function SharedMediaView({ item }: { item: SharedMediaItem }) {
  const theme = useTheme();
  if (item.tipo === 'foto') {
    return (
      <Image
        source={item.fileUrl}
        style={styles.media}
        contentFit="cover"
        transition={durations.base}
      />
    );
  }
  if (item.tipo === 'video') return <RemoteVideo uri={item.fileUrl} />;
  return (
    <View style={styles.audio}>
      <View style={[styles.audioGlyph, { backgroundColor: theme.colors.accentSoft }]}>
        <Icon name="mic" size={36} color="accent" />
      </View>
      <AudioPlayer uri={item.fileUrl} />
    </View>
  );
}

function RemoteVideo({ uri }: { uri: string }) {
  const theme = useTheme();
  const player = useVideoPlayer(uri);
  return (
    <VideoView
      player={player}
      style={[styles.media, { backgroundColor: theme.colors.backgroundDeep }]}
      contentFit="contain"
      nativeControls
    />
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  frame: { marginHorizontal: spacing.lg, borderWidth: StyleSheet.hairlineWidth },
  clip: { overflow: 'hidden' },
  media: { width: '100%', height: 440 },
  audio: { minHeight: 320, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.lg },
  audioGlyph: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  body: { paddingHorizontal: spacing.lg, paddingTop: spacing.xl },
  meta: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md },
  caption: { marginTop: spacing.xl },
  privateButton: { marginTop: spacing.xxl },
  savedHint: { marginTop: spacing.sm },
});
