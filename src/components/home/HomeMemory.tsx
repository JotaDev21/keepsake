import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';

import { Icon, PressableScale, Text } from '@/components';
import { radius, spacing, useTheme, withAlpha } from '@/design';
import { mediaUri } from '@/lib/media';
import type { MediaItem } from '@/types/models';

interface HomeMemoryProps {
  memory: MediaItem | null;
  onPress: () => void;
}

/** An album cover: the photograph stays unobstructed; its story lives below. */
export function HomeMemory({ memory, onPress }: HomeMemoryProps) {
  const theme = useTheme();
  const mediaOverlay = withAlpha(theme.colors.seedDeep, 0.94);
  const preview = memory?.tipo === 'foto' ? memory.file : memory?.thumbFile;
  const date = memory?.dataMemoria
    ? new Date(memory.dataMemoria).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' })
    : null;

  return (
    <PressableScale onPress={onPress}
      accessibilityLabel={memory ? `Abrir memória: ${memory.legenda || 'Uma lembrança de vocês'}` : 'Guardar a primeira memória'}
      style={[styles.album, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }, theme.elevation.low]}>
      <View style={[styles.photo, { backgroundColor: theme.colors.surfaceElevated }]}>
        <Image
          source={preview ? { uri: mediaUri(preview) } : require('../../../assets/images/night-sunflower-memory.png')}
          recyclingKey={preview || 'sunflower'} style={StyleSheet.absoluteFill} contentFit="cover" />
        <View style={[styles.label, { backgroundColor: mediaOverlay }]}>
          <Icon name={memory ? 'image' : 'sun'} size={spacing.md} color="textOnMedia" />
          <Text variant="overline" color="textOnMedia">{memory ? 'Memória do dia' : 'Nossa primeira página'}</Text>
        </View>
        {memory && memory.tipo !== 'foto' ? (
          <View style={[styles.play, { backgroundColor: mediaOverlay }]}>
            <Icon name={memory.tipo === 'video' ? 'play' : 'headphones'} size={spacing.xl} color="textOnMedia" />
          </View>
        ) : null}
      </View>
      <View style={styles.caption}>
        <View style={styles.copy}>
          <Text variant="title2" numberOfLines={2}>{memory ? memory.legenda || 'Tem um pouco de nós aqui.' : 'Toda história começa com um instante.'}</Text>
          <Text variant="caption" color="textMuted" numberOfLines={1}>
            {memory ? [date, memory.local].filter(Boolean).join(' · ') || 'Um instante para revisitar.' : 'Toque para guardar o primeiro.'}
          </Text>
        </View>
        <Icon name={memory ? 'arrow-up-right' : 'plus'} size={spacing.xl} color="accent" />
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  album: { borderRadius: radius.lg, borderCurve: 'continuous', borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  photo: { aspectRatio: 1.18, justifyContent: 'flex-start', alignItems: 'flex-start', padding: spacing.lg },
  label: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.pill },
  play: { position: 'absolute', alignSelf: 'center', top: '42%', width: spacing.huge, height: spacing.huge, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  caption: { flexDirection: 'row', gap: spacing.lg, alignItems: 'center', padding: spacing.lg },
  copy: { flex: 1, gap: spacing.xs },
});
