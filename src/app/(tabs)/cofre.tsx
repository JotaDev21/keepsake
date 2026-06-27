import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import Animated from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { enterRise } from '@/animations';
import {
  Chip,
  EmptyState,
  GlassSurface,
  Icon,
  LightboxImage,
  PressableScale,
  Screen,
  Text,
  useTabBarSpace,
  type IconName,
} from '@/components';
import { radius as radiusTokens, spacing, useTheme } from '@/design';
import { haptics } from '@/lib/haptics';
import { pickMedia, takePhoto } from '@/lib/imagePicker';
import { mediaUri } from '@/lib/media';
import { usePersonStore } from '@/stores/usePersonStore';
import { useMediaStore } from '@/stores/useMediaStore';
import type { MediaItem, MediaType } from '@/types/models';

const FILTERS: { label: string; type: MediaType | null }[] = [
  { label: 'Tudo', type: null },
  { label: 'Fotos', type: 'foto' },
  { label: 'Vídeos', type: 'video' },
  { label: 'Áudios', type: 'audio' },
];
const COLS = 3;
const GAP = 6;

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

  const [filter, setFilter] = useState(0);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    if (person) load(person.id);
  }, [person, load]);

  const tile = (width - spacing.lg * 2 - GAP * (COLS - 1)) / COLS;
  const activeType = FILTERS[filter].type;
  const items = activeType ? media.filter((m) => m.tipo === activeType) : media;

  const runImport = async (fn: () => Promise<void>) => {
    setSheetOpen(false);
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

  const recordAudio = () => {
    setSheetOpen(false);
    router.push('/gravar-audio');
  };

  const confirmDelete = (item: MediaItem) => {
    haptics.warning();
    Alert.alert('Remover', 'Apagar esta lembrança do cofre?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Apagar', style: 'destructive', onPress: () => remove(item.id) },
    ]);
  };

  const openDetail = (item: MediaItem) =>
    router.push({ pathname: '/memoria/[id]', params: { id: String(item.id) } });

  return (
    <>
      <Screen scroll>
        <View style={styles.header}>
          <Text variant="title1" color="text">
            Cofre
          </Text>
          {media.length > 0 ? (
            <Text variant="subhead" color="textMuted" style={{ marginTop: 2 }}>
              {media.length} {media.length === 1 ? 'lembrança guardada' : 'lembranças guardadas'}
            </Text>
          ) : null}
        </View>

        {media.length === 0 ? (
          <EmptyState
            icon="image"
            title="O cofre ainda está em silêncio."
            message="Toque no + para guardar a primeira foto, vídeo ou áudio."
            actionLabel="Adicionar"
            onAction={() => setSheetOpen(true)}
          />
        ) : (
          <>
            <View style={styles.filters}>
              {FILTERS.map((f, i) => (
                <Chip key={f.label} label={f.label} selected={filter === i} onPress={() => setFilter(i)} />
              ))}
            </View>

            <View style={[styles.grid, { gap: GAP }]}>
              {items.map((item, i) => (
                <Animated.View key={item.id} entering={enterRise(i)}>
                  {item.tipo === 'foto' ? (
                    <Pressable onLongPress={() => confirmDelete(item)} delayLongPress={350}>
                      <LightboxImage
                        uri={mediaUri(item.file)}
                        radius={theme.radius.sm}
                        style={{ width: tile, height: tile, borderRadius: theme.radius.sm, overflow: 'hidden' }}
                      />
                    </Pressable>
                  ) : (
                    <MediaTile
                      item={item}
                      size={tile}
                      onPress={() => openDetail(item)}
                      onLongPress={() => confirmDelete(item)}
                    />
                  )}
                </Animated.View>
              ))}
            </View>
          </>
        )}
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
          style={[styles.fab, { backgroundColor: theme.colors.accent }]}
        >
          <Icon name="plus" size={26} color="onAccent" />
        </PressableScale>
      </View>

      {importing ? (
        <View style={[StyleSheet.absoluteFill, styles.importing, { backgroundColor: theme.colors.overlay }]}>
          <ActivityIndicator color={theme.colors.accent} />
          <Text variant="subhead" color="textSecondary" style={{ marginTop: 12 }}>
            Guardando…
          </Text>
        </View>
      ) : null}

      <AddSheet
        visible={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onGallery={importGallery}
        onCamera={importCamera}
        onAudio={recordAudio}
        bottomInset={insets.bottom}
      />
    </>
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
          borderRadius: theme.radius.sm,
          overflow: 'hidden',
          backgroundColor: theme.colors.surfaceElevated,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {isVideo && item.thumbFile ? (
          <Image source={mediaUri(item.thumbFile)} style={StyleSheet.absoluteFill} contentFit="cover" />
        ) : null}
        <View style={[styles.badge, { backgroundColor: theme.colors.scrim }]}>
          <Icon name={isVideo ? 'play' : 'music'} size={18} color="textOnMedia" />
        </View>
      </View>
    </Pressable>
  );
}

function AddSheet({
  visible,
  onClose,
  onGallery,
  onCamera,
  onAudio,
  bottomInset,
}: {
  visible: boolean;
  onClose: () => void;
  onGallery: () => void;
  onCamera: () => void;
  onAudio: () => void;
  bottomInset: number;
}) {
  const theme = useTheme();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: theme.colors.scrim }]} onPress={onClose} />
      <View style={[styles.sheetWrap, { paddingBottom: bottomInset + 16 }]} pointerEvents="box-none">
        <GlassSurface radius={radiusTokens.xl} intensity="strong" strong style={styles.sheet}>
          <Text variant="overline" color="textMuted" style={{ marginBottom: 8 }}>
            Guardar no cofre
          </Text>
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
  header: { marginTop: 8, marginBottom: 18 },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 18 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  badge: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  fabWrap: { position: 'absolute', right: 20 },
  fab: { width: 58, height: 58, borderRadius: 29, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.35, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 12 },
  importing: { alignItems: 'center', justifyContent: 'center' },
  sheetWrap: { flex: 1, justifyContent: 'flex-end', paddingHorizontal: 12 },
  sheet: { padding: 18 },
  option: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 12 },
  optionIcon: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
});
