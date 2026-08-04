import { useEffect, useState } from 'react';
import { Alert, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import { useVideoPlayer, VideoView } from 'expo-video';
import Animated from 'react-native-reanimated';
import { useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { enterRise, fadeIn } from '@/animations';
import {
  AudioPlayer,
  BackButton,
  Button,
  Card,
  Chip,
  DatePickerField,
  EmptyState,
  Icon,
  Text,
  TextField,
} from '@/components';
import { mediaRepo } from '@/db/repositories';
import { durations, spacing, useTheme } from '@/design';
import { formatDate } from '@/lib/format';
import { haptics } from '@/lib/haptics';
import { mediaUri } from '@/lib/media';
import { useSyncStore } from '@/stores/useSyncStore';
import { useMediaStore } from '@/stores/useMediaStore';
import type { MediaItem } from '@/types/models';

/** Detalhe de memória — immersive view of a single photo / video / audio. */
export default function MemoriaDetail() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [item, setItem] = useState<MediaItem | null | undefined>(undefined);
  const [sharing, setSharing] = useState(false);
  const [editing, setEditing] = useState(false);
  const [savingDetails, setSavingDetails] = useState(false);
  const [caption, setCaption] = useState('');
  const [place, setPlace] = useState('');
  const [memoryDate, setMemoryDate] = useState(() => new Date());
  const partnerJoined = useSyncStore((state) => state.partnerJoined);
  const setMediaShared = useSyncStore((state) => state.setMediaShared);
  const updateDetails = useMediaStore((state) => state.updateDetails);

  useEffect(() => {
    const n = Number(id);
    if (!Number.isFinite(n)) {
      setItem(null);
      return;
    }
    mediaRepo.getById(n).then(setItem).catch(() => setItem(null));
  }, [id]);

  const changeSharing = async (next: boolean) => {
    if (!item || sharing) return;
    setSharing(true);
    const result = await setMediaShared(item.id, next);
    const refreshed = await mediaRepo.getById(item.id);
    setItem(refreshed);
    setSharing(false);
    if (!result.ok) {
      Alert.alert('Não foi possível', result.message);
      return;
    }
    haptics.success();
    if (result.message) Alert.alert(next ? 'Vai ser de vocês' : 'Voltando a ser só sua', result.message);
  };

  const askSharingChange = () => {
    if (!item) return;
    if (!item.shared) {
      void changeSharing(true);
      return;
    }
    Alert.alert(
      'Voltar a ser só sua?',
      'A lembrança continua neste celular, mas deixa de aparecer no outro aparelho.',
      [
        { text: 'Manter de vocês', style: 'cancel' },
        { text: 'Deixar privada', style: 'destructive', onPress: () => void changeSharing(false) },
      ],
    );
  };

  const openEditor = () => {
    if (!item) return;
    setCaption(item.legenda ?? '');
    setPlace(item.local ?? '');
    setMemoryDate(new Date(item.dataMemoria ?? item.criadoEm));
    setEditing(true);
  };

  const saveDetails = async () => {
    if (!item || savingDetails) return;
    setSavingDetails(true);
    const details = {
      legenda: caption.trim() || null,
      local: place.trim() || null,
      dataMemoria: memoryDate.getTime(),
    };
    try {
      await updateDetails(item.id, details);
      const refreshed = { ...item, ...details };
      setItem(refreshed);
      if (refreshed.shared) await setMediaShared(refreshed.id, true);
      setEditing(false);
      haptics.success();
    } catch {
      Alert.alert('Não consegui salvar', 'A lembrança continua intacta. Tente novamente.');
    } finally {
      setSavingDetails(false);
    }
  };

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
        contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xxxl }}
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
              <Text variant="quote" color="text" style={{ marginTop: spacing.lg }}>
                {item.legenda}
              </Text>
            </Animated.View>
          ) : (
            <Animated.View entering={fadeIn(120)}>
              <Text variant="serif" color="textMuted" style={{ marginTop: spacing.lg }}>
                Uma lembrança guardada.
              </Text>
            </Animated.View>
          )}

          <Animated.View entering={enterRise(2)}>
            {editing ? (
              <Card style={styles.editorCard}>
                <Text variant="overline" color="accent">Dar contexto à lembrança</Text>
                <Text variant="subhead" color="textMuted" style={styles.editorHint}>
                  Um detalhe pequeno costuma ser o que faz tudo voltar.
                </Text>
                <View style={styles.editorFields}>
                  <TextField
                    label="O que você quer lembrar"
                    value={caption}
                    onChangeText={setCaption}
                    placeholder="O riso, a conversa, o que ficou…"
                    multiline
                  />
                  <TextField
                    label="Lugar (opcional)"
                    value={place}
                    onChangeText={setPlace}
                    placeholder="Onde vocês estavam"
                  />
                  <DatePickerField label="Quando aconteceu" value={memoryDate} onChange={setMemoryDate} />
                </View>
                <View style={styles.editorActions}>
                  <Button label="Cancelar" variant="ghost" size="sm" onPress={() => setEditing(false)} />
                  <Button label="Guardar detalhes" icon="check" size="sm" loading={savingDetails} onPress={saveDetails} />
                </View>
              </Card>
            ) : (
              <Button
                label="Editar detalhes"
                icon="edit-3"
                variant="ghost"
                size="sm"
                onPress={openEditor}
                style={styles.editButton}
              />
            )}
          </Animated.View>

          <Animated.View entering={enterRise(3)}>
            <Card style={styles.sharingCard}>
              <View style={styles.sharingHeader}>
                <View style={[styles.sharingGlyph, { backgroundColor: theme.colors.accentSoft }]}>
                  <Icon name={item.shared ? 'users' : 'lock'} size={20} color="accent" />
                </View>
                <View style={styles.sharingCopy}>
                  <Text variant="callout" color="text">
                    {item.shared ? 'Uma memória de vocês' : 'Só neste celular'}
                  </Text>
                  <Text variant="subhead" color="textMuted" style={styles.sharingHint}>
                    {item.shared
                      ? 'A outra pessoa pode revisitar esta lembrança no espaço compartilhado.'
                      : 'Nada sai do aparelho até você escolher tornar essa lembrança de vocês.'}
                  </Text>
                </View>
              </View>
              <Button
                label={item.shared ? 'Voltar a ser só minha' : 'Tornar nossa'}
                icon={item.shared ? 'lock' : 'heart'}
                variant={item.shared ? 'secondary' : 'primary'}
                fullWidth
                loading={sharing}
                disabled={!partnerJoined}
                onPress={askSharingChange}
                style={styles.sharingButton}
              />
              {!partnerJoined ? (
                <Text variant="caption" color="textFaint" style={styles.sharingHint}>
                  Conecte os dois celulares para compartilhar.
                </Text>
              ) : null}
            </Card>
          </Animated.View>
        </View>
      </Animated.ScrollView>

      <BackButton />
    </View>
  );
}

function MediaView({ item, topInset }: { item: MediaItem; topInset: number }) {
  const theme = useTheme();

  // A memória chega emoldurada: canto generoso, hairline âmbar, sombra baixa.
  const frame: StyleProp<ViewStyle> = [
    styles.mediaFrame,
    {
      marginTop: topInset + spacing.huge,
      borderRadius: theme.radius.xl,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
    },
    theme.elevation.low,
  ];
  const clip: StyleProp<ViewStyle> = [styles.mediaClip, { borderRadius: theme.radius.xl }];

  if (item.tipo === 'foto') {
    return (
      <Animated.View entering={fadeIn(0)} style={frame}>
        <View style={clip}>
          <Image
            source={mediaUri(item.file)}
            style={styles.image}
            contentFit="cover"
            transition={durations.base}
          />
        </View>
      </Animated.View>
    );
  }

  if (item.tipo === 'video') {
    return (
      <Animated.View entering={fadeIn(0)} style={frame}>
        <View style={clip}>
          <VideoBlock uri={mediaUri(item.file)} />
        </View>
      </Animated.View>
    );
  }

  return (
    <View style={frame}>
      <View style={[clip, styles.audioHero]}>
        <View style={[styles.audioGlyph, { backgroundColor: theme.colors.accentSoft }]}>
          <Icon name="mic" size={36} color="accent" />
        </View>
        <View style={styles.audioPlayer}>
          <AudioPlayer uri={mediaUri(item.file)} />
        </View>
      </View>
    </View>
  );
}

function VideoBlock({ uri }: { uri: string }) {
  const theme = useTheme();
  const player = useVideoPlayer(uri, (p) => {
    p.loop = false;
  });
  return (
    <VideoView
      player={player}
      style={[styles.video, { backgroundColor: theme.colors.backgroundDeep }]}
      contentFit="contain"
      nativeControls
    />
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  mediaFrame: { marginHorizontal: spacing.lg, borderWidth: StyleSheet.hairlineWidth },
  mediaClip: { overflow: 'hidden' },
  image: { width: '100%', height: 440 },
  video: { width: '100%', height: 440 },
  audioHero: { alignItems: 'center', paddingTop: spacing.xxxl, paddingBottom: spacing.xxl },
  audioGlyph: { width: 88, height: 88, borderRadius: 44, alignItems: 'center', justifyContent: 'center' },
  audioPlayer: { width: '100%', paddingHorizontal: spacing.lg, marginTop: spacing.xl },
  body: { paddingHorizontal: spacing.lg, paddingTop: spacing.xl },
  metaRow: { flexDirection: 'row', gap: spacing.sm },
  sharingCard: { marginTop: spacing.xxl },
  editButton: { marginTop: spacing.lg, alignSelf: 'flex-start' },
  editorCard: { marginTop: spacing.xl },
  editorHint: { marginTop: spacing.xs },
  editorFields: { marginTop: spacing.lg, gap: spacing.sm },
  editorActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm, marginTop: spacing.lg },
  sharingHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  sharingGlyph: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  sharingCopy: { flex: 1 },
  sharingHint: { marginTop: spacing.xs },
  sharingButton: { marginTop: spacing.lg },
});
