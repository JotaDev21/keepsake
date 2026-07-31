import { useEffect, useMemo } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import Animated from 'react-native-reanimated';

import { enterRise } from '@/animations';
import {
  Button,
  Icon,
  LightboxImage,
  MoodSelector,
  PressableScale,
  PulseCard,
  Screen,
  ScreenHeader,
  Text,
} from '@/components';
import { radius, spacing, useTheme, withAlpha } from '@/design';
import { countdownLabel, dayAgeLabel, daysUntil, momentAgeLabel, presenceLabel } from '@/lib/dates';
import { formatLongDate, greetingForHour } from '@/lib/format';
import { mediaUri } from '@/lib/media';
import { memoryOfDay } from '@/lib/memory';
import { moodColor, moodScale, startOfDay } from '@/lib/mood';
import {
  isPulseFresh,
  type PulseKind,
  type PulseResponseKind,
} from '@/lib/pulse';
import { useNow } from '@/lib/useNow';
import { useMediaStore } from '@/stores/useMediaStore';
import { useMoodStore } from '@/stores/useMoodStore';
import { usePersonStore } from '@/stores/usePersonStore';
import { useSyncStore } from '@/stores/useSyncStore';

const DAY = 86_400_000;
const NUDGE_TTL = DAY;
const PARTNER_MOOD_MAX_AGE = 7 * DAY;

const moodLabel = (key: string) => moodScale.find((mood) => mood.key === key)?.label ?? key;

export default function HojeScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const nowMs = useNow();
  const now = new Date(nowMs);

  const person = usePersonStore((state) => state.person);
  const dates = usePersonStore((state) => state.dates);
  const media = useMediaStore((state) => state.items);
  const loadMedia = useMediaStore((state) => state.load);
  const moodToday = useMoodStore((state) => state.today);
  const loadMood = useMoodStore((state) => state.load);
  const saveMood = useMoodStore((state) => state.save);
  const syncStatus = useSyncStore((state) => state.status);
  const paired = useSyncStore((state) => state.paired);
  const partnerJoined = useSyncStore((state) => state.partnerJoined);
  const partnerMood = useSyncStore((state) => state.partnerMood);
  const partnerDates = useSyncStore((state) => state.partnerDates);
  const myPulse = useSyncStore((state) => state.myPulse);
  const partnerPulse = useSyncStore((state) => state.partnerPulse);
  const partnerProfile = useSyncStore((state) => state.partnerProfile);
  const myPulseSeenAt = useSyncStore((state) => state.myPulseSeenAt);
  const responseToMyPulse = useSyncStore((state) => state.responseToMyPulse);
  const myResponseToPartnerPulse = useSyncStore((state) => state.myResponseToPartnerPulse);
  const pushPulse = useSyncStore((state) => state.pushPulse);
  const respondToPulse = useSyncStore((state) => state.respondToPulse);
  const acknowledgePartnerPulse = useSyncStore((state) => state.acknowledgePartnerPulse);
  const lastNudgeAt = useSyncStore((state) => state.lastNudgeAt);
  const lastNudgeKind = useSyncStore((state) => state.lastNudgeKind);

  useEffect(() => {
    if (!person) return;
    void loadMedia(person.id);
    void loadMood(person.id);
  }, [loadMedia, loadMood, person]);

  const memory = memoryOfDay(media);
  const memoryHeight = Math.min(460, (width - spacing.lg * 2) * 1.05);
  const nome = person?.nome ?? 'a outra pessoa';
  const partnerName = partnerProfile?.displayName ?? nome;
  const moodIndex = moodToday ? moodScale.findIndex((mood) => mood.key === moodToday.humor) : null;

  const upcoming = useMemo(
    () =>
      [...dates, ...partnerDates]
        .filter((date) => date.recorrente || daysUntil(date.data, date.recorrente) >= 0)
        .sort(
          (left, right) =>
            daysUntil(left.data, left.recorrente) - daysUntil(right.data, right.recorrente),
        )[0] ?? null,
    [dates, partnerDates],
  );

  const togetherDays = useMemo(() => {
    const firstDate = dates
      .filter((date) => date.tipo === 'primeiro_encontro')
      .map((date) => date.data)
      .sort((left, right) => left - right)[0];
    if (!firstDate) return null;
    return Math.max(0, Math.floor((startOfDay() - startOfDay(new Date(firstDate))) / DAY));
  }, [dates]);

  const nudgeFresh = lastNudgeAt != null && nowMs - lastNudgeAt < NUDGE_TTL;
  const partnerMoodFresh =
    partnerMood != null && startOfDay() - partnerMood.dia < PARTNER_MOOD_MAX_AGE;
  const partnerMoodToday = partnerMood?.dia === startOfDay();

  const pickMood = (index: number) => {
    if (!person) return;
    void saveMood(person.id, {
      dia: startOfDay(),
      humor: moodScale[index].key,
      intensidade: moodToday?.intensidade ?? 3,
      nota: moodToday?.nota ?? null,
      tags: moodToday?.tags ?? [],
    });
  };

  const pickPulse = (kind: PulseKind) => {
    void pushPulse(kind);
  };

  const respondPulse = (kind: PulseResponseKind) => {
    void respondToPulse(kind);
  };

  useEffect(() => {
    if (!partnerPulse) return;
    void acknowledgePartnerPulse();
  }, [acknowledgePartnerPulse, partnerPulse]);

  return (
    <Screen scroll padded={false}>
      <Animated.View entering={enterRise(0)} style={styles.header}>
        <ScreenHeader
          overline={formatLongDate(now)}
          title={`${greetingForHour(now.getHours())}.`}
          subtitle={`Um instante para estar perto de ${nome}.`}
        />
        {togetherDays != null ? (
          <View
            style={[
              styles.timeTogether,
              { backgroundColor: theme.colors.accentSoft, borderColor: theme.colors.accentEdge },
            ]}
          >
            <Icon name="heart" size={13} color="accent" />
            <Text variant="overline" color="accent">
              {togetherDays} dias de vocês
            </Text>
          </View>
        ) : null}
      </Animated.View>

      {nudgeFresh ? (
        <Animated.View entering={enterRise(1)}>
          <PressableScale
            onPress={() => {
              if (lastNudgeKind === 'checkin') router.push('/humor');
            }}
            disabled={lastNudgeKind !== 'checkin'}
            haptic={lastNudgeKind === 'checkin'}
            style={[
              styles.nudge,
              { backgroundColor: theme.colors.accentSoft, borderColor: theme.colors.accentEdge },
            ]}
          >
            <Icon
              name={lastNudgeKind === 'agua' ? 'droplet' : lastNudgeKind === 'checkin' ? 'activity' : 'heart'}
              size={17}
              color="accent"
            />
            <Text variant="callout" color="text" style={styles.flex}>
              {lastNudgeKind === 'agua'
                ? `${partnerName} cuidou de você e lembrou da água ${momentAgeLabel(lastNudgeAt)}.`
                : lastNudgeKind === 'checkin'
                  ? `${partnerName} quer saber como você está. Toque para responder.`
                  : `${partnerName} pensou em você ${momentAgeLabel(lastNudgeAt)}.`}
            </Text>
            {lastNudgeKind === 'checkin' ? <Icon name="chevron-right" size={18} color="accent" /> : null}
          </PressableScale>
        </Animated.View>
      ) : null}

      <Animated.View
        entering={enterRise(1)}
        style={[styles.memoryShadow, { backgroundColor: theme.colors.surface }, theme.elevation.low]}
      >
        <View
          style={[
            styles.memoryFrame,
            { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
            { height: memoryHeight },
          ]}
        >
          {memory ? (
            <>
              <LightboxImage uri={mediaUri(memory.file)} radius={radius.xl} style={StyleSheet.absoluteFill} />
              <LinearGradient
                colors={['transparent', withAlpha(theme.colors.backgroundDeep, 0.94)]}
                locations={[0.38, 1]}
                pointerEvents="none"
                style={StyleSheet.absoluteFill}
              />
              <View pointerEvents="none" style={styles.memoryText}>
                <Text variant="overline" color="accent">
                  Memória do dia
                </Text>
                <Text variant="title2" color="textOnMedia" style={styles.memoryTitle}>
                  {memory.legenda ?? 'Uma lembrança guardada.'}
                </Text>
              </View>
            </>
          ) : (
            <>
              <Image
                source={require('../../../assets/images/night-sunflower-memory.png')}
                style={StyleSheet.absoluteFill}
                contentFit="cover"
                transition={theme.durations.slow}
              />
              <LinearGradient
                colors={['transparent', withAlpha(theme.colors.backgroundDeep, 0.98)]}
                locations={[0.24, 0.84]}
                pointerEvents="none"
                style={StyleSheet.absoluteFill}
              />
              <View style={styles.emptyMemoryCopy}>
                <Text variant="overline" color="accent">
                  o começo
                </Text>
                <Text variant="title1" color="textOnMedia" style={styles.emptyMemoryTitle}>
                  A primeira memória ainda espera por vocês.
                </Text>
                <Text variant="callout" color="textSecondary" style={styles.emptyMemoryHint}>
                  Não precisa ser perfeita. Só precisa ser de verdade.
                </Text>
                <Button
                  label="Guardar a primeira"
                  icon="plus"
                  size="sm"
                  onPress={() => router.push('/cofre')}
                  style={styles.emptyMemoryAction}
                />
              </View>
            </>
          )}
        </View>
      </Animated.View>

      <View style={styles.body}>
        {syncStatus === 'ready' && partnerJoined ? (
          <Animated.View entering={enterRise(2)} style={styles.section}>
            <PulseCard
              partnerName={partnerName}
              partnerAvatarUrl={partnerProfile?.avatarUrl}
              partnerPresenceLabel={presenceLabel(partnerProfile?.lastSeenAt ?? null)}
              myPulse={myPulse}
              partnerPulse={partnerPulse}
              myPulseSeenAt={myPulseSeenAt}
              responseToMyPulse={responseToMyPulse}
              myResponseToPartnerPulse={myResponseToPartnerPulse}
              onSelect={pickPulse}
              onRespond={respondPulse}
            />
          </Animated.View>
        ) : syncStatus === 'ready' ? (
          <Animated.View entering={enterRise(2)} style={styles.section}>
            <Button
              label={paired ? `Convidar ${nome}` : `Conectar com ${nome}`}
              icon="heart"
              variant="secondary"
              fullWidth
              onPress={() => router.push('/conexao')}
            />
          </Animated.View>
        ) : null}

        <Animated.View entering={enterRise(2)} style={styles.section}>
          <View style={styles.sectionHeading}>
            <View style={styles.headingCopy}>
              <Text variant="overline" color="textMuted">
                leitura de agora
              </Text>
              <Text variant="title1" color="text" style={styles.headingTitle}>
                Como está o seu coração?
              </Text>
            </View>
            <Button label="Abrir" variant="ghost" size="sm" onPress={() => router.push('/humor')} />
          </View>
          <MoodSelector options={moodScale} value={moodIndex} onChange={pickMood} />
        </Animated.View>

        {syncStatus === 'ready' &&
        partnerJoined &&
        partnerMood &&
        partnerMoodFresh &&
        !isPulseFresh(partnerPulse, nowMs) ? (
          <Animated.View
            entering={enterRise(3)}
            style={[
              styles.partnerCard,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
                experimental_backgroundImage: `linear-gradient(150deg, ${theme.colors.surfaceHighlight} 0%, transparent 70%)`,
              },
            ]}
          >
            <View style={styles.flex}>
              <Text variant="overline" color={partnerMoodToday ? 'accent' : 'textMuted'}>
                {partnerMoodToday ? `${nome}, hoje` : `${nome}, ${dayAgeLabel(partnerMood.dia)}`}
              </Text>
              <Text variant="title1" color="text" style={styles.headingTitle}>
                {moodLabel(partnerMood.humor)}
              </Text>
              <Text variant="caption" color="textMuted" style={styles.partnerMoodCopy}>
                O clima que {nome} escolheu compartilhar com você.
              </Text>
            </View>
            <View
              style={[
                styles.moodOrb,
                {
                  borderColor: withAlpha(moodColor(partnerMood.humor), 0.7),
                  backgroundColor: withAlpha(moodColor(partnerMood.humor), 0.14),
                  boxShadow: `0 10px 26px ${withAlpha(moodColor(partnerMood.humor), 0.24)}`,
                },
              ]}
            >
              <View
                style={[
                  styles.moodOrbRing,
                  { borderColor: withAlpha(moodColor(partnerMood.humor), 0.42) },
                ]}
              />
              <View style={[styles.moodOrbCore, { backgroundColor: moodColor(partnerMood.humor) }]} />
            </View>
          </Animated.View>
        ) : null}

        {upcoming ? (
          <Animated.View
            entering={enterRise(4)}
            style={[
              styles.nextDate,
              {
                borderColor: theme.colors.border,
                backgroundColor: theme.colors.surface,
                experimental_backgroundImage: `linear-gradient(145deg, ${theme.colors.surfaceElevated} 0%, ${theme.colors.surface} 58%, ${theme.colors.accentSoft} 160%)`,
              },
            ]}
          >
            <Text variant="overline" color="textMuted">
              {'authorId' in upcoming ? `Data de ${partnerName}` : 'Próxima data'}
            </Text>
            <View style={styles.dateRow}>
              <Text variant="title2" color="text" style={styles.flex}>
                {upcoming.titulo}
              </Text>
              <Text variant="callout" color="accent">
                {countdownLabel(upcoming.data, upcoming.recorrente)}
              </Text>
            </View>
          </Animated.View>
        ) : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { paddingHorizontal: spacing.lg, marginTop: spacing.md, marginBottom: spacing.xl },
  timeTogether: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: spacing.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
  nudge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  memoryShadow: { marginHorizontal: spacing.lg, borderRadius: radius.xl },
  memoryFrame: {
    justifyContent: 'flex-end',
    overflow: 'hidden',
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
  },
  memoryText: { padding: spacing.lg },
  memoryTitle: { marginTop: spacing.sm },
  emptyMemoryCopy: {
    position: 'absolute',
    left: spacing.xl,
    right: spacing.xl,
    bottom: spacing.xl,
    alignItems: 'flex-start',
  },
  emptyMemoryTitle: { marginTop: spacing.sm, maxWidth: 310 },
  emptyMemoryHint: { marginTop: spacing.xs, maxWidth: 300 },
  emptyMemoryAction: { marginTop: spacing.lg },
  body: { paddingHorizontal: spacing.lg, paddingTop: spacing.xxl },
  section: { marginBottom: spacing.xxl },
  sectionHeading: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  headingCopy: { flex: 1 },
  headingTitle: { marginTop: spacing.xs },
  partnerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.xxl,
    padding: spacing.xl,
    borderRadius: radius.xl,
    borderCurve: 'continuous',
    borderWidth: StyleSheet.hairlineWidth,
    boxShadow: '0 14px 36px rgba(0,0,0,0.22)',
  },
  partnerMoodCopy: { marginTop: spacing.xs },
  moodOrb: {
    width: 62,
    height: 62,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
  moodOrbRing: {
    position: 'absolute',
    width: 42,
    height: 42,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
  moodOrbCore: { width: 14, height: 14, borderRadius: radius.pill },
  nextDate: {
    marginBottom: spacing.xxl,
    padding: spacing.xl,
    borderRadius: radius.xl,
    borderCurve: 'continuous',
    borderWidth: StyleSheet.hairlineWidth,
    boxShadow: '0 14px 36px rgba(0,0,0,0.22)',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
    gap: spacing.lg,
  },
});
