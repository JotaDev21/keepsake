import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';

import { Button, Chip, Icon, Text, useTabBarSpace } from '@/components';
import { spacing, useTheme } from '@/design';
import { countdownLabel } from '@/lib/dates';
import { mediaUri } from '@/lib/media';
import { usePersonStore } from '@/stores/usePersonStore';

/** Perfil — editorial cover with the name overlaid; crisp facts/dates below. */
export default function PerfilScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const tabSpace = useTabBarSpace();
  const person = usePersonStore((s) => s.person);
  const facts = usePersonStore((s) => s.facts);
  const dates = usePersonStore((s) => s.dates);
  const scrollY = useSharedValue(0);

  const onScroll = useAnimatedScrollHandler((e) => {
    scrollY.value = e.contentOffset.y;
  });

  const COVER_H = width * 1.2;

  const coverStyle = useAnimatedStyle(() => {
    const y = scrollY.value;
    return {
      transform: [
        { translateY: interpolate(y, [-COVER_H, 0, COVER_H], [COVER_H * 0.4, 0, -COVER_H * 0.25], Extrapolation.CLAMP) },
        { scale: interpolate(y, [-COVER_H, 0], [1.4, 1], Extrapolation.CLAMP) },
      ],
    };
  });

  if (!person) return null;

  const coverSource = person.coverFile ? mediaUri(person.coverFile) : null;

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      <Animated.ScrollView
        onScroll={onScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: tabSpace }}
      >
        <View style={[styles.cover, { height: COVER_H }]}>
          <Animated.View style={[StyleSheet.absoluteFill, coverStyle]}>
            {coverSource ? (
              <Image source={coverSource} style={StyleSheet.absoluteFill} contentFit="cover" transition={300} />
            ) : (
              <LinearGradient colors={[theme.colors.accentSoft, theme.colors.background]} style={StyleSheet.absoluteFill} />
            )}
          </Animated.View>
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.9)']}
            locations={[0.4, 1]}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />
          <View style={styles.coverText} pointerEvents="none">
            <Text variant="overline" color="accent">
              {person.apelido ? `“${person.apelido}”` : 'Dedicado a'}
            </Text>
            <Text variant="hero" color="textOnMedia" style={{ marginTop: 6 }}>
              {person.nome}
            </Text>
          </View>
        </View>

        <View style={styles.sheet}>
          {person.bio ? (
            <Text variant="quote" color="textSecondary" style={styles.bio}>
              {person.bio}
            </Text>
          ) : null}

          <View style={styles.actions}>
            <Button label="Editar" icon="edit-2" variant="secondary" size="sm" onPress={() => router.push('/editar-perfil')} />
            <Button label="Ajustes" icon="settings" variant="ghost" size="sm" onPress={() => router.push('/ajustes')} />
          </View>

          {person.comoSeConheceram ? (
            <View style={styles.section}>
              <Text variant="overline" color="textMuted" style={styles.kicker}>
                Como nos conhecemos
              </Text>
              <Text variant="serif" color="text">
                {person.comoSeConheceram}
              </Text>
            </View>
          ) : null}

          {facts.length > 0 ? (
            <View style={styles.section}>
              <Text variant="overline" color="textMuted" style={styles.kicker}>
                Sobre ela
              </Text>
              {facts.map((f) => (
                <View key={f.id} style={[styles.factRow, { borderTopColor: theme.colors.border }]}>
                  <Text variant="overline" color="textMuted">
                    {f.chave}
                  </Text>
                  <Text variant="title2" color="text" style={{ marginTop: 6 }}>
                    {f.valor}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}

          {dates.length > 0 ? (
            <View style={styles.section}>
              <Text variant="overline" color="textMuted" style={styles.kicker}>
                Datas importantes
              </Text>
              <View style={styles.chips}>
                {dates.map((d) => (
                  <Chip key={d.id} label={`${d.titulo} · ${countdownLabel(d.data, d.recorrente)}`} icon="calendar" />
                ))}
              </View>
            </View>
          ) : null}

          {facts.length === 0 && dates.length === 0 ? (
            <View style={styles.emptyHint}>
              <Icon name="feather" size={20} color="textMuted" />
              <Text variant="body" color="textMuted" style={{ marginTop: 10 }}>
                Toque em “Editar” para guardar quem ela é.
              </Text>
            </View>
          ) : null}
        </View>
      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  cover: { width: '100%', overflow: 'hidden', justifyContent: 'flex-end' },
  coverText: { padding: spacing.lg, paddingBottom: spacing.xl },
  sheet: { paddingHorizontal: spacing.lg, paddingTop: spacing.xl },
  bio: { marginBottom: spacing.lg },
  actions: { flexDirection: 'row', gap: 10, marginBottom: spacing.sm },
  section: { marginTop: spacing.xxl },
  kicker: { marginBottom: 14 },
  factRow: { paddingVertical: 16, borderTopWidth: StyleSheet.hairlineWidth },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  emptyHint: { marginTop: spacing.xxl, alignItems: 'flex-start' },
});
