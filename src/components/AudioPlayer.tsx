import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';

import { radius as radiusTokens, spacing, useTheme } from '@/design';
import { haptics } from '@/lib/haptics';

import { Icon } from './Icon';
import { PressableScale } from './PressableScale';
import { Text } from './Text';

const BARS = 38;

function fmt(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;
}

interface AudioPlayerProps {
  uri: string;
}

/** Audio playback with a stylized waveform (real progress; bars are decorative). */
export function AudioPlayer({ uri }: AudioPlayerProps) {
  const theme = useTheme();
  const player = useAudioPlayer(uri);
  const status = useAudioPlayerStatus(player);

  const progress = status.duration > 0 ? status.currentTime / status.duration : 0;
  const remaining = status.duration > 0 ? status.duration - status.currentTime : 0;

  const heights = useMemo(
    () => Array.from({ length: BARS }, (_, i) => 0.25 + Math.abs(Math.sin(i * 1.7) * Math.cos(i * 0.5)) * 0.75),
    [],
  );

  const toggle = () => {
    haptics.tap();
    if (status.playing) {
      player.pause();
    } else {
      if (status.didJustFinish || (status.duration > 0 && status.currentTime >= status.duration)) {
        player.seekTo(0);
      }
      player.play();
    }
  };

  return (
    <View style={styles.row}>
      <PressableScale
        onPress={toggle}
        haptic={false}
        accessibilityLabel={status.playing ? 'Pausar' : 'Tocar'}
        style={[
          styles.btn,
          { backgroundColor: theme.colors.accent, borderRadius: radiusTokens.pill },
          theme.elevation.low,
        ]}
      >
        <Icon name={status.playing ? 'pause' : 'play'} size={20} color="onAccent" />
      </PressableScale>

      <View style={styles.wave}>
        {heights.map((h, i) => (
          <View
            key={i}
            style={{
              width: 3,
              height: 30 * h,
              borderRadius: radiusTokens.pill,
              backgroundColor: i / BARS <= progress ? theme.colors.accent : theme.colors.borderStrong,
            }}
          />
        ))}
      </View>

      <Text variant="caption" color="textMuted" style={styles.time}>
        {fmt(remaining)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  btn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  wave: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: 32 },
  time: { width: 38, textAlign: 'right' },
});
