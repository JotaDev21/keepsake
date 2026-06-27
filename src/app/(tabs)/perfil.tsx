import { StyleSheet, View } from 'react-native';
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

import { Button, Card, Chip, Icon, Text, useTabBarSpace } from '@/components';
import { radius as radiusTokens, useTheme } from '@/design';
import { countdownLabel } from '@/lib/dates';
import { mediaUri } from '@/lib/media';
import { usePersonStore } from '@/stores/usePersonStore';

const COVER_HEIGHT = 360;

/** Perfil — who she is. The cover drifts slower than the content (parallax). */
export default function PerfilScreen() {
  const theme = useTheme();
  const router = useRouter();
  const tabSpace = useTabBarSpace();
  const person = usePersonStore((s) => s.person);
  const facts = usePersonStore((s) => s.facts);
  const dates = usePersonStore((s) => s.dates);
  const scrollY = useSharedValue(0);

  const onScroll = useAnimatedScrollHandler((e) => {
    scrollY.value = e.contentOffset.y;
  });

  const coverStyle = useAnimatedStyle(() => {
    const y = scrollY.value;
    return {
      transform: [
        {
          translateY: interpolate(
            y,
            [-COVER_HEIGHT, 0, COVER_HEIGHT],
            [COVER_HEIGHT * 0.5, 0, -COVER_HEIGHT * 0.4],
            Extrapolation.CLAMP,
          ),
        },
        { scale: interpolate(y, [-COVER_HEIGHT, 0], [1.5, 1], Extrapolation.CLAMP) },
      ],
    };
  });

  if (!person) return null;

  const coverSource = person.coverFile ? mediaUri(person.coverFile) : null;
  const avatarSource = person.avatarFile ? mediaUri(person.avatarFile) : null;

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      <Animated.View style={[styles.cover, { height: COVER_HEIGHT }, coverStyle]}>
        {coverSource ? (
          <Image source={coverSource} style={StyleSheet.absoluteFill} contentFit="cover" transition={300} />
        ) : (
          <LinearGradient
            colors={[theme.colors.accentSoft, theme.colors.background]}
            style={StyleSheet.absoluteFill}
          />
        )}
        <LinearGradient colors={['transparent', theme.colors.background]} style={styles.coverScrim} />
      </Animated.View>

      <Animated.ScrollView
        onScroll={onScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: tabSpace }}
      >
        <View style={{ height: COVER_HEIGHT - 84 }} />
        <View style={[styles.sheet, { backgroundColor: theme.colors.background }]}>
          <View style={[styles.avatarWrap, { borderColor: theme.colors.background, backgroundColor: theme.colors.surface }]}>
            {avatarSource ? (
              <Image source={avatarSource} style={StyleSheet.absoluteFill} contentFit="cover" transition={300} />
            ) : (
              <Icon name="user" size={30} color="textMuted" />
            )}
          </View>

          <Text variant="hero" color="text">
            {person.nome}
          </Text>
          {person.apelido ? (
            <Text variant="serif" color="accent">
              “{person.apelido}”
            </Text>
          ) : null}
          {person.bio ? (
            <Text variant="quote" color="textSecondary" style={{ marginTop: 14 }}>
              {person.bio}
            </Text>
          ) : null}

          {person.comoSeConheceram ? (
            <View style={{ marginTop: 20 }}>
              <Text variant="overline" color="textMuted">
                Como nos conhecemos
              </Text>
              <Text variant="quote" color="textSecondary" style={{ marginTop: 6 }}>
                {person.comoSeConheceram}
              </Text>
            </View>
          ) : null}

          <View style={styles.profileActions}>
            <Button
              label="Editar perfil"
              icon="edit-2"
              variant="secondary"
              size="sm"
              onPress={() => router.push('/editar-perfil')}
            />
            <Button
              label="Ajustes"
              icon="settings"
              variant="ghost"
              size="sm"
              onPress={() => router.push('/ajustes')}
            />
          </View>

          {facts.length > 0 ? (
            <>
              <Text variant="heading" color="text" style={styles.sectionTitle}>
                Sobre ela
              </Text>
              <Card>
                {facts.map((f, i) => (
                  <View
                    key={f.id}
                    style={[
                      styles.factRow,
                      i === 0
                        ? null
                        : { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.colors.border },
                    ]}
                  >
                    <Text variant="subhead" color="textMuted" style={{ flex: 1 }}>
                      {f.chave}
                    </Text>
                    <Text variant="callout" color="text" align="right" style={{ flex: 1.4 }}>
                      {f.valor}
                    </Text>
                  </View>
                ))}
              </Card>
            </>
          ) : null}

          {dates.length > 0 ? (
            <>
              <Text variant="heading" color="text" style={styles.sectionTitle}>
                Datas importantes
              </Text>
              <View style={styles.chips}>
                {dates.map((d) => (
                  <Chip key={d.id} label={`${d.titulo} · ${countdownLabel(d.data, d.recorrente)}`} icon="calendar" />
                ))}
              </View>
            </>
          ) : null}

          {facts.length === 0 && dates.length === 0 ? (
            <Text variant="body" color="textMuted" style={{ marginTop: 28 }}>
              Toque em “Editar perfil” para guardar fatos e datas sobre ela.
            </Text>
          ) : null}
        </View>
      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  cover: { position: 'absolute', top: 0, left: 0, right: 0 },
  coverScrim: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 180 },
  sheet: {
    flex: 1,
    minHeight: 600,
    paddingHorizontal: 16,
    paddingTop: 24,
    borderTopLeftRadius: radiusTokens.xl,
    borderTopRightRadius: radiusTokens.xl,
  },
  avatarWrap: {
    alignSelf: 'flex-start',
    marginTop: -68,
    marginBottom: 10,
    width: 84,
    height: 84,
    borderRadius: 45,
    borderWidth: 3,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileActions: { flexDirection: 'row', gap: 10, marginTop: 22 },
  sectionTitle: { marginTop: 32, marginBottom: 12 },
  factRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 12 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
