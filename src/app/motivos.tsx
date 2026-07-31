import { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, StyleSheet, View, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { enterRise } from '@/animations';
import { BackButton, Button, EmptyState, Icon, PressableScale, ScreenHeader, Text, TextField } from '@/components';
import { darken, lighten, radius as radiusTokens, spacing, springs, useTheme } from '@/design';
import { reasonSparks } from '@/lib/ai';
import { haptics } from '@/lib/haptics';
import { usePersonStore } from '@/stores/usePersonStore';
import { useReasonStore } from '@/stores/useReasonStore';

const SWIPE = 110;
/** Acima deste comprimento, o motivo desce um degrau na escala tipográfica. */
const LONG_REASON = 90;

export default function MotivosScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const person = usePersonStore((s) => s.person);
  const items = useReasonStore((s) => s.items);
  const load = useReasonStore((s) => s.load);
  const add = useReasonStore((s) => s.add);
  const remove = useReasonStore((s) => s.remove);

  const [index, setIndex] = useState(0);
  const [dealCount, setDealCount] = useState(0);
  const [composing, setComposing] = useState(false);
  const [texto, setTexto] = useState('');
  const [sparks, setSparks] = useState<string[] | null>(null);
  const [sparksLoading, setSparksLoading] = useState(false);

  const onSparks = async () => {
    if (sparksLoading) return;
    haptics.tap();
    setSparksLoading(true);
    const out = await reasonSparks(person?.nome ?? 'essa pessoa');
    setSparksLoading(false);
    if (out) setSparks(out);
  };

  const tx = useSharedValue(0);
  const ty = useSharedValue(0);

  useEffect(() => {
    if (person) load(person.id);
  }, [person, load]);

  // O card só volta ao centro depois que o novo texto já foi renderizado.
  // Zerar tx/ty junto do setIndex faria o motivo antigo piscar no centro
  // por um frame (o shared value reseta na UI thread antes do re-render).
  useEffect(() => {
    if (dealCount === 0) return;
    const raf = requestAnimationFrame(() => {
      tx.value = 0;
      ty.value = 0;
    });
    return () => cancelAnimationFrame(raf);
  }, [dealCount, tx, ty]);

  const n = items.length;
  const safeIndex = n > 0 ? index % n : 0;
  const current = n > 0 ? items[safeIndex] : null;
  const behind = n > 1 ? items[(safeIndex + 1) % n] : null;

  const commitNext = () => {
    setIndex((i) => (i + 1) % Math.max(n, 1));
    setDealCount((c) => c + 1);
    haptics.selection();
  };

  const next = () => {
    if (n < 2) return;
    tx.value = withSpring(-width * 1.3, springs.glide, (fin) => {
      if (fin) runOnJS(commitNext)();
    });
  };

  const pan = Gesture.Pan()
    .onUpdate((e) => {
      tx.value = e.translationX;
      ty.value = e.translationY * 0.35;
    })
    .onEnd((e) => {
      if (n > 1 && Math.abs(e.translationX) > SWIPE) {
        const dir = e.translationX > 0 ? 1 : -1;
        tx.value = withSpring(
          dir * width * 1.3,
          { ...springs.glide, velocity: e.velocityX },
          (fin) => {
            if (fin) runOnJS(commitNext)();
          },
        );
      } else {
        tx.value = withSpring(0, springs.gentle);
        ty.value = withSpring(0, springs.gentle);
      }
    });

  const topStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: tx.value },
      { translateY: ty.value },
      { rotate: `${interpolate(tx.value, [-width, 0, width], [-12, 0, 12])}deg` },
    ],
  }));

  const behindStyle = useAnimatedStyle(() => {
    const p = Math.min(Math.abs(tx.value) / SWIPE, 1);
    return {
      transform: [{ scale: interpolate(p, [0, 1], [0.92, 0.98]) }],
      opacity: interpolate(p, [0, 1], [0.6, 0.9]),
    };
  });

  const onAdd = async () => {
    if (!person || !texto.trim()) return;
    await add(person.id, texto.trim());
    setTexto('');
    setSparks(null);
    setComposing(false);
    setIndex(0);
    haptics.success();
  };

  const onDelete = () => {
    if (!person || !current) return;
    Alert.alert('Apagar motivo', 'Tirar esta razão do baralho?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Apagar',
        style: 'destructive',
        onPress: async () => {
          await remove(person.id, current.id);
          setIndex(0);
        },
      },
    ]);
  };

  const cardW = width - spacing.lg * 2;
  const cardH = Math.min(height * 0.5, 460);

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      <Animated.View entering={enterRise(0)} style={{ paddingTop: insets.top + spacing.huge, paddingHorizontal: spacing.lg }}>
        <ScreenHeader
          overline="Motivos pra amar"
          title={person?.nome ? `Por que ${person.nome}` : 'Razões'}
        />
      </Animated.View>

      {n === 0 ? (
        <EmptyState
          icon="heart"
          title="O baralho está vazio."
          message="Escreva a primeira razão — daquelas que você não quer esquecer."
          actionLabel="Escrever uma"
          onAction={() => setComposing(true)}
        />
      ) : (
        <View style={styles.deck}>
          {behind ? (
            <Animated.View style={[styles.card, { width: cardW, height: cardH }, behindStyle]}>
              <ReasonFace texto={behind.texto} theme={theme} />
            </Animated.View>
          ) : null}

          <GestureDetector gesture={pan}>
            <Animated.View style={[styles.card, styles.top, { width: cardW, height: cardH }, topStyle]}>
              <PressableScale
                onLongPress={onDelete}
                onPress={next}
                haptic={false}
                accessibilityLabel="Motivo"
                style={styles.fill}
              >
                <ReasonFace texto={current?.texto ?? ''} theme={theme} full />
              </PressableScale>
            </Animated.View>
          </GestureDetector>
        </View>
      )}

      {n > 0 ? (
        <View style={[styles.counterRow, { bottom: insets.bottom + 148 }]}>
          <Text variant="caption" color="textMuted">
            {safeIndex + 1} de {n} · arraste ou toque · segure para apagar
          </Text>
        </View>
      ) : null}

      {/* Compose. */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={[styles.compose, { paddingBottom: insets.bottom + spacing.lg, borderTopColor: theme.colors.border, backgroundColor: theme.colors.background }]}
      >
        {composing ? (
          <>
            <TextField
              value={texto}
              onChangeText={setTexto}
              placeholder="Um jeito, um gesto, um dia…"
              autoFocus
              multiline
            />
            {sparks ? (
              <View style={styles.sparks}>
                {sparks.map((s) => (
                  <Text key={s} variant="quote" color="textSecondary">
                    {s}
                  </Text>
                ))}
              </View>
            ) : null}
            <View style={styles.composeRow}>
              <Button label="Guardar" icon="check" onPress={onAdd} disabled={!texto.trim()} size="sm" />
              <Button
                label={sparksLoading ? 'Pensando…' : 'Me inspira'}
                icon="feather"
                variant="ghost"
                size="sm"
                onPress={onSparks}
                loading={sparksLoading}
              />
              <Button
                label="Cancelar"
                variant="ghost"
                size="sm"
                onPress={() => {
                  setComposing(false);
                  setTexto('');
                  setSparks(null);
                }}
              />
            </View>
          </>
        ) : (
          <PressableScale onPress={() => setComposing(true)} accessibilityLabel="Adicionar motivo">
            <View style={[styles.addPill, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
              <Icon name="plus" size={18} color="accent" />
              <Text variant="callout" color="textSecondary">
                Escrever um novo motivo
              </Text>
            </View>
          </PressableScale>
        )}
      </KeyboardAvoidingView>

      <BackButton />
    </View>
  );
}

function ReasonFace({ texto, theme, full = false }: { texto: string; theme: ReturnType<typeof useTheme>; full?: boolean }) {
  const longo = texto.length > LONG_REASON;
  return (
    <LinearGradient
      colors={[lighten(theme.colors.accent, 0.12), theme.colors.accent, darken(theme.colors.accent, 0.12)]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.face, { borderRadius: radiusTokens.xl }]}
    >
      <View style={styles.watermark} pointerEvents="none">
        <Icon name="sun" size={full ? 120 : 90} color={theme.colors.onAccent} />
      </View>
      <Text variant="overline" style={{ color: theme.colors.onAccent }}>
        porque
      </Text>
      <Text
        variant={longo ? 'title2' : 'title1'}
        numberOfLines={longo ? 8 : 6}
        adjustsFontSizeToFit
        minimumFontScale={0.7}
        style={{ color: theme.colors.onAccent, marginTop: spacing.md }}
      >
        {texto}
      </Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  fill: { flex: 1 },
  deck: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  card: { position: 'absolute', alignSelf: 'center' },
  top: { zIndex: 2 },
  face: { flex: 1, padding: spacing.xl, justifyContent: 'flex-end', overflow: 'hidden' },
  watermark: { position: 'absolute', top: -18, right: -12, opacity: 0.14 },
  counterRow: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  compose: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  composeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, alignItems: 'center' },
  sparks: { gap: spacing.sm, marginBottom: spacing.md },
  addPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    height: 52,
    paddingHorizontal: spacing.lg,
    borderRadius: radiusTokens.pill,
    borderWidth: StyleSheet.hairlineWidth,
    justifyContent: 'center',
  },
});
