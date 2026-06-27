import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';

import { AudioPlayer, BackButton, Button, Icon, PressableScale, Text } from '@/components';
import { useTheme } from '@/design';
import { haptics } from '@/lib/haptics';
import { usePersonStore } from '@/stores/usePersonStore';
import { useMediaStore } from '@/stores/useMediaStore';

function fmt(ms: number): string {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;
}

export default function GravarAudio() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const person = usePersonStore((s) => s.person);
  const addMedia = useMediaStore((s) => s.add);

  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recState = useAudioRecorderState(recorder);
  const [recordedUri, setRecordedUri] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const pulse = useSharedValue(1);

  useEffect(() => {
    requestRecordingPermissionsAsync().then(({ granted }) => {
      if (granted) setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true }).catch(() => {});
    });
  }, []);

  useEffect(() => {
    if (recState.isRecording) {
      pulse.value = withRepeat(
        withTiming(1.12, { duration: 700, easing: Easing.inOut(Easing.ease) }),
        -1,
        true,
      );
    } else {
      cancelAnimation(pulse);
      pulse.value = withTiming(1, { duration: 200 });
    }
  }, [recState.isRecording, pulse]);

  const pulseStyle = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }] }));

  const start = async () => {
    haptics.medium();
    setRecordedUri(null);
    await recorder.prepareToRecordAsync();
    recorder.record();
  };

  const stop = async () => {
    haptics.medium();
    await recorder.stop();
    setRecordedUri(recorder.uri ?? null);
  };

  const save = async () => {
    if (!recordedUri || !person || saving) return;
    setSaving(true);
    try {
      await setAudioModeAsync({ allowsRecording: false }).catch(() => {});
      await addMedia(person.id, { tipo: 'audio', sourceUri: recordedUri });
      haptics.success();
      router.back();
    } catch (e) {
      console.warn('ev: falha ao salvar áudio', e);
      setSaving(false);
    }
  };

  return (
    <View
      style={[
        styles.root,
        { backgroundColor: theme.colors.backgroundDeep, paddingTop: insets.top, paddingBottom: insets.bottom + 24 },
      ]}
    >
      <View style={styles.center}>
        <Text variant="overline" color="accent">
          Gravar áudio
        </Text>
        <Text variant="title2" color="text" align="center" style={styles.title}>
          {recordedUri ? 'Ficou bom?' : recState.isRecording ? 'Ouvindo você' : 'A voz dela, guardada'}
        </Text>

        {recordedUri ? (
          <View style={styles.preview}>
            <AudioPlayer uri={recordedUri} />
          </View>
        ) : (
          <>
            <PressableScale
              onPress={recState.isRecording ? stop : start}
              haptic={false}
              accessibilityLabel={recState.isRecording ? 'Parar' : 'Gravar'}
            >
              <Animated.View style={[styles.mic, { backgroundColor: theme.colors.accent }, pulseStyle]}>
                <Icon name={recState.isRecording ? 'square' : 'mic'} size={34} color="onAccent" />
              </Animated.View>
            </PressableScale>
            <Text variant="display" color="text" style={{ marginTop: 28 }}>
              {fmt(recState.durationMillis)}
            </Text>
          </>
        )}
      </View>

      {recordedUri ? (
        <View style={styles.actions}>
          <Button label="Regravar" variant="ghost" icon="rotate-ccw" onPress={() => setRecordedUri(null)} />
          <Button label="Salvar" icon="check" onPress={save} loading={saving} size="lg" style={styles.saveBtn} />
        </View>
      ) : null}

      <BackButton />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  title: { marginTop: 8, marginBottom: 44 },
  mic: { width: 120, height: 120, borderRadius: 60, alignItems: 'center', justifyContent: 'center' },
  preview: { width: '100%', paddingHorizontal: 8 },
  actions: { flexDirection: 'row', gap: 12, paddingHorizontal: 16, alignItems: 'center' },
  saveBtn: { flex: 1 },
});
