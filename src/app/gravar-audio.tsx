import { useEffect, useState } from 'react';
import { AppState, Linking, StyleSheet, View } from 'react-native';
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
  getRecordingPermissionsAsync,
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';

import { AudioPlayer, BackButton, Button, Icon, PressableScale, ScreenHeader, Text } from '@/components';
import { radius, spacing, useTheme } from '@/design';
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
  const [micDenied, setMicDenied] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

  const pulse = useSharedValue(1);

  useEffect(() => {
    requestRecordingPermissionsAsync()
      .then(({ granted }) => {
        setMicDenied(!granted);
        if (granted) setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true }).catch(() => {});
      })
      .catch(() => setMicDenied(true));
  }, []);

  // Se ela foi às configurações e voltou, checa de novo em silêncio.
  useEffect(() => {
    if (!micDenied) return;
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return;
      getRecordingPermissionsAsync()
        .then(({ granted }) => {
          if (granted) {
            setMicDenied(false);
            setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true }).catch(() => {});
          }
        })
        .catch(() => {});
    });
    return () => sub.remove();
  }, [micDenied]);

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
    setStartError(null);
    try {
      await recorder.prepareToRecordAsync();
      recorder.record();
    } catch (e) {
      console.warn('ev: falha ao iniciar gravação', e);
      haptics.error();
      setStartError('Não deu pra começar agora. Respira e tenta de novo.');
    }
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
        {
          backgroundColor: theme.colors.backgroundDeep,
          paddingTop: insets.top + spacing.huge,
          paddingBottom: insets.bottom + spacing.xl,
        },
      ]}
    >
      <ScreenHeader
        overline="Gravar áudio"
        title={recordedUri ? 'Ficou bom?' : recState.isRecording ? 'Ouvindo você' : 'Uma voz, guardada'}
        mark={false}
      />

      <View style={styles.center}>
        {recordedUri ? (
          <View style={styles.preview}>
            <AudioPlayer uri={recordedUri} />
          </View>
        ) : micDenied ? (
          <View style={styles.denied}>
            <View
              style={[
                styles.deniedIcon,
                { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
              ]}
            >
              <Icon name="mic-off" size={28} color="textMuted" />
            </View>
            <Text variant="body" color="textSecondary" align="center">
              O microfone está desligado pra este app. Ative nas configurações do aparelho.
            </Text>
            <Button
              label="Abrir configurações"
              variant="secondary"
              icon="settings"
              onPress={() => {
                Linking.openSettings().catch(() => {});
              }}
            />
          </View>
        ) : (
          <>
            <PressableScale
              onPress={recState.isRecording ? stop : start}
              haptic={false}
              accessibilityLabel={recState.isRecording ? 'Parar' : 'Gravar'}
            >
              <Animated.View
                style={[styles.mic, { backgroundColor: theme.colors.accent }, theme.elevation.medium, pulseStyle]}
              >
                <Icon name={recState.isRecording ? 'square' : 'mic'} size={34} color="onAccent" />
              </Animated.View>
            </PressableScale>
            <Text variant="display" color="text" style={styles.timer}>
              {fmt(recState.durationMillis)}
            </Text>
            {startError ? (
              <Text variant="caption" color="textMuted" align="center" style={styles.startError}>
                {startError}
              </Text>
            ) : null}
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
  root: { flex: 1, paddingHorizontal: spacing.lg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.sm },
  mic: {
    width: 120,
    height: 120,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timer: { marginTop: spacing.xl },
  denied: { alignItems: 'center', gap: spacing.lg, paddingHorizontal: spacing.lg },
  deniedIcon: {
    width: 72,
    height: 72,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  startError: { marginTop: spacing.md },
  preview: { width: '100%', paddingHorizontal: spacing.sm },
  actions: { flexDirection: 'row', gap: spacing.md, alignItems: 'center' },
  saveBtn: { flex: 1 },
});
