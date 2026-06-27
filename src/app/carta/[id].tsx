import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BackButton, Button, EmptyState, Icon, Text } from '@/components';
import { letterRepo } from '@/db/repositories';
import { durations, useTheme } from '@/design';
import { countdownLabel } from '@/lib/dates';
import { formatDate } from '@/lib/format';
import { haptics } from '@/lib/haptics';
import { useLetterStore } from '@/stores/useLetterStore';
import type { Letter } from '@/types/models';

/** Carta & cápsula — read a letter; capsules unlock on their date with a ritual. */
export default function CartaDetail() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const markOpened = useLetterStore((s) => s.open);

  const [letter, setLetter] = useState<Letter | null | undefined>(undefined);
  const [opened, setOpened] = useState(false);
  const reveal = useSharedValue(0);

  useEffect(() => {
    const n = Number(id);
    if (!Number.isFinite(n)) {
      setLetter(null);
      return;
    }
    letterRepo
      .getById(n)
      .then((l) => {
        setLetter(l);
        if (l && (l.aberta || l.abrirEm == null)) {
          setOpened(true);
          reveal.value = 1;
        }
      })
      .catch(() => setLetter(null));
  }, [id, reveal]);

  const letterStyle = useAnimatedStyle(() => ({
    opacity: reveal.value,
    transform: [{ scale: 0.92 + reveal.value * 0.08 }, { translateY: (1 - reveal.value) * 28 }],
  }));
  const glowStyle = useAnimatedStyle(() => ({ opacity: reveal.value * (1 - reveal.value) * 2.4 }));

  if (letter === undefined) {
    return <View style={[styles.root, { backgroundColor: theme.colors.backgroundDeep }]}><BackButton /></View>;
  }
  if (letter === null) {
    return (
      <View style={[styles.root, { backgroundColor: theme.colors.backgroundDeep }]}>
        <EmptyState icon="mail" title="Carta não encontrada." />
        <BackButton />
      </View>
    );
  }

  const isCapsule = letter.abrirEm != null;
  const locked = isCapsule && letter.abrirEm != null && letter.abrirEm > Date.now() && !letter.aberta;

  const open = () => {
    haptics.heavy();
    setOpened(true);
    reveal.value = withTiming(1, { duration: durations.ritual, easing: Easing.out(Easing.cubic) });
    markOpened(letter.id);
  };

  return (
    <View
      style={[
        styles.root,
        { backgroundColor: theme.colors.backgroundDeep, paddingTop: insets.top, paddingBottom: insets.bottom },
      ]}
    >
      {locked ? (
        <View style={styles.center}>
          <View style={[styles.seal, { backgroundColor: theme.colors.accentSoft, borderColor: theme.colors.accent }]}>
            <Icon name="lock" size={28} color="accent" />
          </View>
          <Text variant="overline" color="accent" style={{ marginTop: 24 }}>
            Cápsula selada
          </Text>
          <Text variant="title1" color="text" align="center" style={{ marginTop: 8 }}>
            {letter.titulo}
          </Text>
          <Text variant="subhead" color="textMuted" align="center" style={styles.hint}>
            Abre {countdownLabel(letter.abrirEm as number, false)} · {formatDate(new Date(letter.abrirEm as number))}
          </Text>
        </View>
      ) : !opened ? (
        <View style={styles.center}>
          <View style={[styles.seal, { backgroundColor: theme.colors.accentSoft, borderColor: theme.colors.accent }]}>
            <Icon name="mail" size={28} color="accent" />
          </View>
          <Text variant="overline" color="accent" style={{ marginTop: 24 }}>
            Cápsula pronta
          </Text>
          <Text variant="title1" color="text" align="center" style={{ marginTop: 8 }}>
            {letter.titulo}
          </Text>
          <Text variant="subhead" color="textMuted" align="center" style={styles.hint}>
            Chegou o momento. Abra com calma.
          </Text>
          <Button label="Abrir" icon="mail" onPress={open} style={{ marginTop: 32 }} />
        </View>
      ) : (
        <View style={styles.center}>
          <Animated.View
            pointerEvents="none"
            style={[styles.glow, { backgroundColor: theme.colors.accentGlow }, glowStyle]}
          />
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.letterScroll}>
            <Animated.View style={letterStyle}>
              <Text variant="overline" color="accent" align="center">
                {isCapsule ? 'Cápsula aberta' : 'Carta'}
              </Text>
              <Text variant="title1" color="text" align="center" style={styles.letterTitle}>
                {letter.titulo}
              </Text>
              <Text variant="serif" color="text">
                {letter.corpo}
              </Text>
            </Animated.View>
          </ScrollView>
        </View>
      )}

      <BackButton />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28 },
  seal: { width: 96, height: 96, borderRadius: 48, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  hint: { marginTop: 12, maxWidth: 300 },
  glow: { position: 'absolute', width: 360, height: 360, borderRadius: 180, top: '24%' },
  letterScroll: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 48 },
  letterTitle: { marginTop: 8, marginBottom: 24 },
});
