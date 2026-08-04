import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import Animated from 'react-native-reanimated';

import { enterRise } from '@/animations';
import { Button, Chip, EmptyState, Icon, Screen, SunflowerMark, Text, type IconName } from '@/components';
import { radius, spacing, useTheme } from '@/design';
import { countdownLabel } from '@/lib/dates';
import { mediaUri } from '@/lib/media';
import { usePersonStore } from '@/stores/usePersonStore';

const AVATAR = 72;

function iconForFact(key: string): IconName {
  const normalized = key.toLowerCase();
  if (normalized.includes('música')) return 'music';
  if (normalized.includes('comida')) return 'coffee';
  if (normalized.includes('sonho')) return 'star';
  if (normalized.includes('lugar')) return 'map-pin';
  if (normalized.includes('sorr')) return 'sun';
  return 'heart';
}

/** Perfil — entardecer: framed cover, close serif name, warm amber sections. */
export default function PerfilScreen() {
  const theme = useTheme();
  const router = useRouter();
  const person = usePersonStore((s) => s.person);
  const facts = usePersonStore((s) => s.facts);
  const dates = usePersonStore((s) => s.dates);

  if (!person) return null;

  const coverSource = person.coverFile ? mediaUri(person.coverFile) : null;
  const avatarSource = person.avatarFile ? mediaUri(person.avatarFile) : null;

  return (
    <Screen scroll>
      <Animated.View entering={enterRise(0)} style={styles.hero}>
        <View
          style={[
            styles.cover,
            { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
            theme.elevation.low,
          ]}
        >
          {coverSource ? (
            <Image
              source={coverSource}
              style={[StyleSheet.absoluteFill, styles.coverFill]}
              contentFit="cover"
              transition={300}
            />
          ) : (
            <LinearGradient
              colors={[theme.colors.accentSoft, theme.colors.surface]}
              style={[StyleSheet.absoluteFill, styles.coverFill, styles.coverEmpty]}
            >
              <SunflowerMark size={44} />
            </LinearGradient>
          )}
          <LinearGradient
            pointerEvents="none"
            colors={['transparent', theme.colors.overlay]}
            locations={[0.38, 1]}
            style={[StyleSheet.absoluteFill, styles.coverFill]}
          />
          <View style={styles.identity}>
            <Text variant="overline" color="accent">
              dedicado a
            </Text>
            <Text variant="hero" color="textOnMedia" style={styles.name}>
              {person.nome}
            </Text>
            {person.apelido ? (
              <Text variant="quote" color="textOnMedia" style={styles.nickname}>
                “{person.apelido}”
              </Text>
            ) : null}
          </View>
        </View>

        {avatarSource ? (
          <View
            style={[
              styles.avatar,
              { backgroundColor: theme.colors.surface, borderColor: theme.colors.background },
              theme.elevation.low,
            ]}
          >
            <Image
              source={avatarSource}
              style={[StyleSheet.absoluteFill, styles.avatarFill]}
              contentFit="cover"
              transition={300}
            />
          </View>
        ) : null}

        {person.bio ? (
          <Text variant="quote" color="textSecondary" style={styles.bio}>
            {person.bio}
          </Text>
        ) : null}

        <View style={styles.actions}>
          <Button label="Editar" icon="edit-2" variant="secondary" size="sm" onPress={() => router.push('/editar-perfil')} />
          <Button label="Cartas" icon="mail" variant="secondary" size="sm" onPress={() => router.push('/cartas')} />
          <Button label="Ajustes" icon="settings" variant="ghost" size="sm" onPress={() => router.push('/ajustes')} />
        </View>
      </Animated.View>

      {person.comoSeConheceram ? (
        <Animated.View entering={enterRise(1)} style={[styles.story, { borderColor: theme.colors.border }]}>
          <Text variant="overline" color="accent" style={styles.kicker}>
            Como nos conhecemos
          </Text>
          <Text variant="quote" color="text">
            {person.comoSeConheceram}
          </Text>
        </Animated.View>
      ) : null}

      {facts.length > 0 ? (
        <Animated.View entering={enterRise(3)} style={[styles.section, { borderTopColor: theme.colors.border }]}>
          <Text variant="overline" color="accent" style={styles.kicker}>
              Sobre essa pessoa
          </Text>
          <View style={styles.factGrid}>
          {facts.map((f) => (
            <View
              key={f.id}
              style={[
                styles.factCard,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                  experimental_backgroundImage: `linear-gradient(145deg, ${theme.colors.surfaceElevated} 0%, ${theme.colors.surface} 75%, ${theme.colors.accentSoft} 190%)`,
                },
              ]}
            >
              <View style={[styles.factIcon, { backgroundColor: theme.colors.accentSoft }]}>
                <Icon name={iconForFact(f.chave)} size={16} color="accent" />
              </View>
              <Text variant="overline" color="textMuted">
                {f.chave}
              </Text>
              <Text variant="serif" color="text" style={styles.factValue}>
                {f.valor}
              </Text>
            </View>
          ))}
          </View>
        </Animated.View>
      ) : (
        <Animated.View entering={enterRise(3)} style={[styles.section, { borderTopColor: theme.colors.border }]}>
          <EmptyState
            icon="heart"
            title="Os detalhes mais bonitos ainda podem morar aqui."
            message="Guarde uma mania, um sonho ou aquilo que sempre faz essa pessoa sorrir."
            actionLabel="Guardar um detalhe"
            onAction={() => router.push('/editar-perfil')}
            style={styles.emptyHint}
          />
        </Animated.View>
      )}

      {dates.length > 0 ? (
        <Animated.View entering={enterRise(4)} style={[styles.section, { borderTopColor: theme.colors.border }]}>
          <Text variant="overline" color="accent" style={styles.kicker}>
            Datas importantes
          </Text>
          <View style={styles.chips}>
            {dates.map((d) => (
              <Chip key={d.id} label={`${d.titulo} · ${countdownLabel(d.data, d.recorrente)}`} icon="calendar" />
            ))}
          </View>
        </Animated.View>
      ) : null}

    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { marginTop: spacing.sm },
  // No overflow:hidden here — it would clip the warm shadow on iOS; the
  // absolute-fill content carries the same radius instead.
  cover: {
    aspectRatio: 4 / 5,
    borderRadius: radius.xl,
    borderCurve: 'continuous',
    borderWidth: StyleSheet.hairlineWidth,
  },
  coverFill: { borderRadius: radius.xl },
  coverEmpty: { alignItems: 'center', justifyContent: 'center' },
  identity: {
    position: 'absolute',
    left: spacing.xl,
    right: spacing.xl,
    bottom: spacing.xl,
  },
  name: { marginTop: spacing.xs },
  nickname: { marginTop: spacing.xs, opacity: 0.86 },
  avatar: {
    width: AVATAR,
    height: AVATAR,
    borderRadius: AVATAR / 2,
    borderWidth: 3,
    marginTop: -AVATAR / 2,
    marginLeft: spacing.lg,
  },
  avatarFill: { borderRadius: AVATAR / 2 },
  bio: { marginTop: spacing.lg },
  actions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg },
  story: {
    marginTop: spacing.xxl,
    padding: spacing.xl,
    borderRadius: radius.xl,
    borderCurve: 'continuous',
    borderWidth: StyleSheet.hairlineWidth,
  },
  section: {
    marginTop: spacing.xxl,
    paddingTop: spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  kicker: { marginBottom: spacing.md },
  factGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  factCard: {
    width: '48%',
    minHeight: 148,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderCurve: 'continuous',
    borderWidth: StyleSheet.hairlineWidth,
  },
  factIcon: { width: 32, height: 32, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md },
  factValue: { marginTop: spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  emptyHint: { flex: 0, paddingVertical: spacing.xxl },
});
