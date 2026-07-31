import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
  type ListRenderItemInfo,
} from 'react-native';
import { Image } from 'expo-image';
import Animated from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { enterRise } from '@/animations';
import {
  Chip,
  Card,
  EmptyState,
  GlassSurface,
  Icon,
  PressableScale,
  Screen,
  ScreenHeader,
  Text,
  useTabBarSpace,
  type IconName,
} from '@/components';
import { durations, radius as radiusTokens, spacing, useTheme } from '@/design';
import { haptics } from '@/lib/haptics';
import { pickMedia, takePhoto } from '@/lib/imagePicker';
import { mediaUri } from '@/lib/media';
import { usePersonStore } from '@/stores/usePersonStore';
import { useMediaStore } from '@/stores/useMediaStore';
import { useSyncStore } from '@/stores/useSyncStore';
import type { MediaItem, MediaType } from '@/types/models';

const FILTERS: { label: string; type: MediaType | null }[] = [
  { label: 'Tudo', type: null },
  { label: 'Fotos', type: 'foto' },
  { label: 'Vídeos', type: 'video' },
  { label: 'Áudios', type: 'audio' },
];
const COLS = 2;
const GAP = 10;

const keyExtractor = (item: MediaItem) => String(item.id);

function RowGap() {
  return <View style={styles.rowGap} />;
}

export default function CofreScreen() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const tabSpace = useTabBarSpace();
  const { width } = useWindowDimensions();

  const person = usePersonStore((s) => s.person);
  const media = useMediaStore((s) => s.items);
  const load = useMediaStore((s) => s.load);
  const add = useMediaStore((s) => s.add);
  const remove = useMediaStore((s) => s.remove);
  const partnerJoined = useSyncStore((s) => s.partnerJoined);
  const sharedMedia = useSyncStore((s) => s.sharedMedia);
  const setMediaShared = useSyncStore((s) => s.setMediaShared);
  const refreshSharedMedia = useSyncStore((s) => s.refreshSharedMedia);

  const [filter, setFilter] = useState(0);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importLabel, setImportLabel] = useState('Guardando…');

  useEffect(() => {
    if (person) load(person.id);
  }, [person, load]);

  useEffect(() => {
    if (partnerJoined) void refreshSharedMedia();
  }, [partnerJoined, refreshSharedMedia]);

  const tile = (width - spacing.lg * 2 - GAP * (COLS - 1)) / COLS;
  const activeType = FILTERS[filter].type;
  const items = activeType ? media.filter((m) => m.tipo === activeType) : media;

  const runImport = async (fn: () => Promise<void>, label = 'Guardando…') => {
    setSheetOpen(false);
    setImportLabel(label);
    setImporting(true);
    try {
      await fn();
    } catch (e) {
      console.warn('ev: falha ao importar mídia', e);
    } finally {
      setImporting(false);
    }
  };

  const importGallery = () =>
    runImport(async () => {
      if (!person) return;
      const picked = await pickMedia();
      if (picked) await add(person.id, { tipo: picked.kind, sourceUri: picked.uri });
    });

  const importCamera = () =>
    runImport(async () => {
      if (!person) return;
      const uri = await takePhoto();
      if (uri) await add(person.id, { tipo: 'foto', sourceUri: uri });
    });

  const shareCameraNow = () =>
    runImport(async () => {
      if (!person) return;
      const uri = await takePhoto();
      if (!uri) return;
      const id = await add(person.id, { tipo: 'foto', sourceUri: uri, dataMemoria: Date.now() });
      const result = await setMediaShared(id, true);
      if (!result.ok) {
        Alert.alert('A foto ficou no seu cofre', result.message ?? 'Não consegui compartilhar agora.');
        return;
      }
      haptics.success();
      if (result.message) Alert.alert('Foto guardada', result.message);
    }, 'Enviando para vocês…');

  const recordAudio = () => {
    setSheetOpen(false);
    router.push('/gravar-audio');
  };

  const confirmDelete = (item: MediaItem) => {
    haptics.warning();
    // A received copy keeps `remoteId` only as provenance. Only the author can
    // remove the shared row, represented locally by `shared: true`.
    const needsRemoteCleanup = item.shared;
    Alert.alert('Remover', needsRemoteCleanup
      ? 'Apagar esta lembrança do cofre e do espaço de vocês?'
      : 'Apagar esta lembrança do cofre?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Apagar',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            if (needsRemoteCleanup) {
              const result = await setMediaShared(item.id, false);
              if (!result.ok || result.message) {
                Alert.alert(
                  result.ok ? 'Esperando conexão' : 'Não foi possível',
                  result.message ?? 'Tente novamente.',
                );
                return;
              }
            }
            await remove(item.id);
          })();
        },
      },
    ]);
  };

  const openDetail = (item: MediaItem) =>
    router.push({ pathname: '/memoria/[id]', params: { id: String(item.id) } });

  const renderItem = ({ item }: ListRenderItemInfo<MediaItem>) =>
    item.tipo === 'foto' ? (
      <PhotoTile
        item={item}
        size={tile}
        onPress={() => openDetail(item)}
        onLongPress={() => confirmDelete(item)}
      />
    ) : (
      <MediaTile
        item={item}
        size={tile}
        onPress={() => openDetail(item)}
        onLongPress={() => confirmDelete(item)}
      />
    );

  return (
    <>
      <Screen padded={false} tabBarPadding={false}>
        <FlatList
          data={items}
          numColumns={COLS}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          columnWrapperStyle={styles.row}
          ItemSeparatorComponent={RowGap}
          style={styles.list}
          contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: tabSpace }}
          showsVerticalScrollIndicator={false}
          initialNumToRender={18}
          windowSize={7}
          removeClippedSubviews
          ListHeaderComponent={
            <Animated.View entering={enterRise()}>
              <ScreenHeader
                overline="Memórias"
                title="Tudo que ficou"
                subtitle={
                  media.length > 0
                    ? `${media.length} ${media.length === 1 ? 'lembrança guardada' : 'lembranças guardadas'}`
                    : undefined
                }
                style={styles.header}
              />
              {partnerJoined ? (
                <Card
                  onPress={() => router.push('/memorias-compartilhadas')}
                  accessibilityLabel="Memórias de vocês"
                  style={styles.sharedCard}
                >
                  <View style={styles.sharedRow}>
                    <View style={[styles.sharedGlyph, { backgroundColor: theme.colors.accentSoft }]}>
                      <Icon name="users" size={19} color="accent" />
                    </View>
                    <View style={styles.sharedCopy}>
                      <Text variant="callout" color="text">
                        Memórias de vocês
                      </Text>
                      <Text variant="subhead" color="textMuted" style={styles.sharedHint}>
                        {sharedMedia.length === 0
                          ? 'As lembranças escolhidas pelos dois aparecem aqui.'
                          : `${sharedMedia.length} ${sharedMedia.length === 1 ? 'lembrança compartilhada' : 'lembranças compartilhadas'}`}
                      </Text>
                    </View>
                    <Icon name="chevron-right" size={20} color="textMuted" />
                  </View>
                </Card>
              ) : null}
              {media.length > 0 ? (
                <>
                  <View style={styles.viewSwitch}>
                    <Chip label="Galeria" icon="image" selected onPress={() => undefined} />
                    <Chip label="Linha do tempo" icon="clock" onPress={() => router.push('/linha-do-tempo')} />
                  </View>
                  <View style={styles.filters}>
                    {FILTERS.map((f, i) => (
                      <Chip key={f.label} label={f.label} selected={filter === i} onPress={() => setFilter(i)} />
                    ))}
                  </View>
                </>
              ) : null}
            </Animated.View>
          }
          ListEmptyComponent={
            media.length === 0 ? (
              <EmptyState
                icon="image"
                title="O cofre ainda está em silêncio."
                message="Toque no + para guardar a primeira foto, vídeo ou áudio."
                actionLabel="Adicionar"
                onAction={() => setSheetOpen(true)}
              />
            ) : null
          }
        />
      </Screen>

      {/* Floating add button */}
      <View style={[styles.fabWrap, { bottom: tabSpace + 8 }]} pointerEvents="box-none">
        <PressableScale
          onPress={() => {
            haptics.tap();
            setSheetOpen(true);
          }}
          haptic={false}
          accessibilityLabel="Adicionar mídia"
          style={[
            styles.fab,
            {
              backgroundColor: theme.colors.accent,
              borderColor: theme.colors.surfaceHighlight,
              experimental_backgroundImage: `linear-gradient(145deg, ${theme.colors.accentBloom} 0%, ${theme.colors.accent} 62%, ${theme.colors.seed} 150%)`,
            },
            theme.elevation.medium,
          ]}
        >
          <Icon name="plus" size={26} color="onAccent" />
        </PressableScale>
      </View>

      {importing ? (
        <View style={[StyleSheet.absoluteFill, styles.importing, { backgroundColor: theme.colors.overlay }]}>
          <ActivityIndicator color={theme.colors.accent} />
          <Text variant="subhead" color="textSecondary" style={{ marginTop: spacing.md }}>
            {importLabel}
          </Text>
        </View>
      ) : null}

      <AddSheet
        visible={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onGallery={importGallery}
        onCamera={importCamera}
        onSharedCamera={partnerJoined ? shareCameraNow : undefined}
        onAudio={recordAudio}
        bottomInset={insets.bottom}
      />
    </>
  );
}

/**
 * Photo cell: renders the lighter thumb (when one exists) via expo-image and
 * grows into the fullscreen lightbox from its own on-screen rect — the hero
 * opens with the original file.
 */
function PhotoTile({
  item,
  size,
  onLongPress,
  onPress,
}: {
  item: MediaItem;
  size: number;
  onPress: () => void;
  onLongPress: () => void;
}) {
  const theme = useTheme();

  return (
    <Pressable onPress={onPress} onLongPress={onLongPress} delayLongPress={350}>
      <View
        style={{
          width: size,
          height: size,
          borderRadius: theme.radius.md,
          overflow: 'hidden',
          backgroundColor: theme.colors.surface,
        }}
      >
        <Image
          source={mediaUri(item.thumbFile ?? item.file)}
          recyclingKey={String(item.id)}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          transition={durations.fast}
        />
        {item.shared ? (
          <View style={[styles.sharedBadge, { backgroundColor: theme.colors.scrim }]}>
            <Icon name="users" size={13} color="textOnMedia" />
          </View>
        ) : null}
        <View
          pointerEvents="none"
          style={[styles.tileEdge, { borderRadius: theme.radius.md, borderColor: theme.colors.border }]}
        />
      </View>
    </Pressable>
  );
}

function MediaTile({
  item,
  size,
  onPress,
  onLongPress,
}: {
  item: MediaItem;
  size: number;
  onPress: () => void;
  onLongPress: () => void;
}) {
  const theme = useTheme();
  const isVideo = item.tipo === 'video';
  return (
    <Pressable onPress={onPress} onLongPress={onLongPress} delayLongPress={350}>
      <View
        style={{
          width: size,
          height: size,
          borderRadius: theme.radius.md,
          overflow: 'hidden',
          backgroundColor: theme.colors.surfaceElevated,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {isVideo && item.thumbFile ? (
          <Image
            source={mediaUri(item.thumbFile)}
            recyclingKey={String(item.id)}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            transition={durations.fast}
          />
        ) : null}
        <View style={[styles.badge, { backgroundColor: theme.colors.scrim }]}>
          <Icon name={isVideo ? 'play' : 'music'} size={18} color="textOnMedia" />
        </View>
        {item.shared ? (
          <View style={[styles.sharedBadge, { backgroundColor: theme.colors.scrim }]}>
            <Icon name="users" size={13} color="textOnMedia" />
          </View>
        ) : null}
        <View
          pointerEvents="none"
          style={[styles.tileEdge, { borderRadius: theme.radius.md, borderColor: theme.colors.border }]}
        />
      </View>
    </Pressable>
  );
}

function AddSheet({
  visible,
  onClose,
  onGallery,
  onCamera,
  onSharedCamera,
  onAudio,
  bottomInset,
}: {
  visible: boolean;
  onClose: () => void;
  onGallery: () => void;
  onCamera: () => void;
  onSharedCamera?: () => void;
  onAudio: () => void;
  bottomInset: number;
}) {
  const theme = useTheme();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: theme.colors.scrim }]} onPress={onClose} />
      <View style={[styles.sheetWrap, { paddingBottom: bottomInset + spacing.lg }]} pointerEvents="box-none">
        <GlassSurface radius={radiusTokens.xl} intensity="strong" strong style={styles.sheet}>
          <Text variant="overline" color="textMuted" style={{ marginBottom: spacing.sm }}>
            Guardar no cofre
          </Text>
          {onSharedCamera ? (
            <View style={[styles.nowOption, { backgroundColor: theme.colors.accentSoft, borderColor: theme.colors.accentEdge }]}>
              <SheetOption icon="send" label="Foto de agora — enviar aos dois" onPress={onSharedCamera} />
              <Text variant="caption" color="textMuted" style={styles.nowHint}>
                Fica no seu cofre e aparece no outro aparelho assim que o envio terminar.
              </Text>
            </View>
          ) : null}
          <SheetOption icon="image" label="Foto ou vídeo" onPress={onGallery} />
          <SheetOption icon="camera" label="Tirar foto" onPress={onCamera} />
          <SheetOption icon="mic" label="Gravar áudio" onPress={onAudio} />
        </GlassSurface>
      </View>
    </Modal>
  );
}

function SheetOption({ icon, label, onPress }: { icon: IconName; label: string; onPress: () => void }) {
  const theme = useTheme();
  return (
    <PressableScale onPress={onPress} haptic style={styles.option}>
      <View style={[styles.optionIcon, { backgroundColor: theme.colors.accentSoft }]}>
        <Icon name={icon} size={20} color="accent" />
      </View>
      <Text variant="callout" color="text">
        {label}
      </Text>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  list: { flex: 1 },
  header: { marginTop: spacing.sm, marginBottom: spacing.xl },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.lg },
  viewSwitch: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
  row: { gap: GAP },
  rowGap: { height: GAP },
  tileEdge: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderWidth: StyleSheet.hairlineWidth },
  badge: { width: 34, height: 34, borderRadius: radiusTokens.pill, alignItems: 'center', justifyContent: 'center' },
  fabWrap: { position: 'absolute', right: spacing.lg },
  fab: {
    width: 62,
    height: 62,
    borderRadius: radiusTokens.pill,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  importing: { alignItems: 'center', justifyContent: 'center' },
  sheetWrap: { flex: 1, justifyContent: 'flex-end', paddingHorizontal: spacing.md },
  sheet: { padding: spacing.lg },
  option: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md },
  optionIcon: { width: 42, height: 42, borderRadius: radiusTokens.pill, alignItems: 'center', justifyContent: 'center' },
  nowOption: {
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    borderRadius: radiusTokens.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  nowHint: { marginLeft: 42 + spacing.md },
  sharedCard: { marginBottom: spacing.lg },
  sharedRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  sharedGlyph: { width: 42, height: 42, borderRadius: radiusTokens.pill, alignItems: 'center', justifyContent: 'center' },
  sharedCopy: { flex: 1 },
  sharedHint: { marginTop: spacing.xs },
  sharedBadge: {
    position: 'absolute',
    top: spacing.xs,
    right: spacing.xs,
    width: 26,
    height: 26,
    borderRadius: radiusTokens.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
