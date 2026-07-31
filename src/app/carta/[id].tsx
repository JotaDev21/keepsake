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

import { BackButton, Button, EmptyState, Icon, SunflowerMark, Text } from '@/components';
import { letterRepo } from '@/db/repositories';
import { durations, spacing, useTheme } from '@/design';
import { countdownLabel } from '@/lib/dates';
import { formatDate } from '@/lib/format';
import { haptics } from '@/lib/haptics';
import { useNow } from '@/lib/useNow';
import { useLetterStore } from '@/stores/useLetterStore';
import { usePersonStore } from '@/stores/usePersonStore';
import type { Letter } from '@/types/models';

/** Carta & cápsula — read a letter; capsules unlock on their date with a ritual. */
export default function CartaDetail() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const markOpened = useLetterStore((s) => s.open);
  const nome = usePersonStore((s) => s.person?.nome ?? 'a outra pessoa');
  const now = useNow(30_000);

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
          // A plain letter auto-reveals without the "Abrir" ritual — still
          // mark it opened so her side gets the quiet "lida".
          if (!l.aberta) markOpened(l.id).catch(() => {});
        }
      })
      .catch(() => setLetter(null));
  }, [id, reveal, markOpened]);

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
  const locked = isCapsule && letter.abrirEm != null && letter.abrirEm > now && !letter.aberta;
  // Her letters arrive sealed with the sunflower — the signature, not an icon.
  const sealedWithMark = letter.direcao === 'recebida';

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
            {sealedWithMark ? <SunflowerMark size={30} /> : <Icon name="lock" size={28} color="accent" />}
          </View>
          <Text variant="overline" color="accent" style={{ marginTop: spacing.xl }}>
            Cápsula selada
          </Text>
          <Text variant="title1" color="text" align="center" style={{ marginTop: spacing.sm }}>
            {letter.direcao === 'recebida' ? `Uma cápsula de ${nome}` : letter.titulo}
          </Text>
          <Text variant="subhead" color="textMuted" align="center" style={styles.hint}>
            Abre {countdownLabel(letter.abrirEm as number, false)} · {formatDate(new Date(letter.abrirEm as number))}
          </Text>
        </View>
      ) : !opened ? (
        <View style={styles.center}>
          <View style={[styles.seal, { backgroundColor: theme.colors.accentSoft, borderColor: theme.colors.accent }]}>
            {sealedWithMark ? <SunflowerMark size={30} /> : <Icon name="mail" size={28} color="accent" />}
          </View>
          <Text variant="overline" color="accent" style={{ marginTop: spacing.xl }}>
            Cápsula pronta
          </Text>
          <Text variant="title1" color="text" align="center" style={{ marginTop: spacing.sm }}>
            {letter.titulo}
          </Text>
          <Text variant="subhead" color="textMuted" align="center" style={styles.hint}>
            Chegou o momento. Abra com calma.
          </Text>
          <Button label="Abrir" icon="mail" onPress={open} style={{ marginTop: spacing.xxl }} />
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
                {letter.direcao === 'recebida'
                  ? `De ${nome}`
                  : isCapsule
                    ? 'Cápsula aberta'
                    : 'Carta'}
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
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xl },
  seal: { width: 96, height: 96, borderRadius: 48, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  hint: { marginTop: spacing.md, maxWidth: 300 },
  glow: { position: 'absolute', width: 360, height: 360, borderRadius: 180, top: '24%' },
  letterScroll: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: spacing.xl, paddingVertical: spacing.xxxl },
  letterTitle: { marginTop: spacing.sm, marginBottom: spacing.xl },
});
