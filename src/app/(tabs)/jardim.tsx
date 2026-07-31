import { useEffect, useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import Animated from 'react-native-reanimated';

import { enterRise } from '@/animations';
import {
  AchievementShelf,
  CareRitual,
  HydrationRitual,
  Icon,
  PetalBurst,
  PressableScale,
  Screen,
  ScreenHeader,
  Sunflower,
  Text,
  type IconName,
} from '@/components';
import { radius, spacing, useTheme, withAlpha } from '@/design';
import { sharedVisitCount } from '@/lib/achievements';
import { bloomFor, gardenStage, stageProgress } from '@/lib/garden';
import { haptics } from '@/lib/haptics';
import { prefs } from '@/lib/prefs';
import { useAchievementStore } from '@/stores/useAchievementStore';
import { useCombinedGarden, useGardenStore } from '@/stores/useGardenStore';
import { usePersonStore } from '@/stores/usePersonStore';
import { useSyncStore } from '@/stores/useSyncStore';
import { useWaterStore } from '@/stores/useWaterStore';

/** Honest either way: solo lines never claim she can feel it. */
const AFFIRMATIONS_SOLO = [
  'Cuidar todo dia é o que faz florescer.',
  'Pequenos gestos, raízes fundas.',
  'O sol volta sempre — e você também.',
  'Amar é regar sem pressa.',
];

const AFFIRMATIONS_SHARED = [
  'Um jardim que os dois regam.',
  'A outra pessoa sente cada vez que você aparece.',
  'Cada visita de vocês soma na mesma flor.',
  'Amar é regar sem pressa — juntos.',
];

export default function JardimScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const person = usePersonStore((s) => s.person);
  const garden = useCombinedGarden();
  const load = useGardenStore((s) => s.load);
  const visitDays = useGardenStore((s) => s.days);
  const waterGarden = useGardenStore((s) => s.water);
  const loadWater = useWaterStore((s) => s.load);
  const partnerJoined = useSyncStore((s) => s.partnerJoined);
  const partnerVisitDays = useSyncStore((s) => s.partnerVisitDays);
  const sharedMedia = useSyncStore((s) => s.sharedMedia);
  const claimAchievement = useAchievementStore((s) => s.claim);
  const [burst, setBurst] = useState(0);

  useEffect(() => {
    if (person) {
      void load(person.id);
      void loadWater(person.id);
    }
  }, [person, load, loadWater]);

  const stats = garden.stats;
  const stage = gardenStage(stats.total);
  const bloom = bloomFor(stats.total);
  const progress = stageProgress(stats.total);
  const flowerSize = Math.min(width * 0.66, 280);
  const nome = person?.nome ?? 'a outra pessoa';

  useEffect(() => {
    if (!partnerJoined) return;
    void claimAchievement('dois_lados');
    const sharedDays = sharedVisitCount(visitDays, partnerVisitDays);
    if (sharedDays >= 1) void claimAchievement('mesmo_dia', { dias: sharedDays });
    if (sharedDays >= 3) void claimAchievement('tres_encontros', { dias: sharedDays });
    if (sharedDays >= 7) void claimAchievement('sete_encontros', { dias: sharedDays });
    if (sharedMedia.length >= 1) void claimAchievement('primeira_memoria', { memorias: sharedMedia.length });
    if (sharedMedia.length >= 10) void claimAchievement('dez_memorias', { memorias: sharedMedia.length });
  }, [claimAchievement, partnerJoined, partnerVisitDays, sharedMedia.length, visitDays]);

  // The day a stage is crossed deserves a small ritual — once per stage, ever.
  const stageChangedToday = stats.todayVisited && stage.key !== gardenStage(stats.total - 1).key;
  useEffect(() => {
    if (stageChangedToday && prefs.getCelebratedStage() !== stage.key) {
      prefs.setCelebratedStage(stage.key);
      haptics.success();
      setBurst((b) => b + 1);
    }
  }, [stageChangedToday, stage.key]);

  const onWater = () => {
    if (!person) return;
    setBurst((b) => b + 1);
    void waterGarden(person.id);
  };

  const affirmations = garden.shared ? AFFIRMATIONS_SHARED : AFFIRMATIONS_SOLO;
  const affirmation = affirmations[stats.total % affirmations.length];

  const careLine = garden.bothToday
    ? 'Vocês dois vieram hoje 🌻'
    : garden.partnerToday && !stats.todayVisited
      ? `${nome} já regou hoje. Toque para regar também.`
      : stats.todayVisited
        ? 'Regado hoje · toque para cuidar'
        : 'Toque no girassol para regar';

  return (
    <Screen scroll padded={false}>
      <Animated.View entering={enterRise(0)} style={styles.header}>
        <ScreenHeader
          overline={garden.shared ? 'O jardim de vocês' : 'Seu jardim'}
          title="O que vocês cultivam"
          subtitle={garden.shared ? 'Pequenos rituais divididos, sem transformar cuidado em cobrança.' : 'Conecte os dois aparelhos quando estiverem prontos.'}
          mark={false}
        />
      </Animated.View>

      {/* Living flower — tap to water it. */}
      <Animated.View
        entering={enterRise(1)}
        style={[
          styles.stage,
          {
            borderColor: theme.colors.border,
            experimental_backgroundImage: [
              `radial-gradient(circle at 50% 46%, ${withAlpha(theme.colors.sunflowerPetal, theme.dark ? 0.16 : 0.22)} 0%, transparent 42%)`,
              `linear-gradient(165deg, ${theme.colors.surfaceHighlight} 0%, transparent 42%)`,
            ].join(','),
          },
        ]}
      >
        <View style={[styles.stageOrbit, { borderColor: withAlpha(theme.colors.sunflowerPetal, 0.18) }]} />
        <View style={[styles.glowField, { width: flowerSize * 1.5, height: flowerSize * 1.5, borderRadius: flowerSize, backgroundColor: withAlpha(theme.colors.accentBloom, theme.dark ? 0.08 : 0.14) }]} />
        <PetalBurst trigger={burst} radius={flowerSize * 0.9} />
        <Sunflower size={flowerSize} stage={bloom} onPress={onWater} />
        <Text variant="caption" color="textFaint" style={{ marginTop: spacing.lg }}>
          {careLine}
        </Text>
      </Animated.View>

      {/* Progress to the next stage. */}
      {stage.key !== 'campo' ? (
        <Animated.View entering={enterRise(2)} style={styles.progressWrap}>
          <View style={[styles.track, { backgroundColor: theme.colors.borderStrong }]}>
            <View style={[styles.fill, { width: `${Math.round(progress * 100)}%`, backgroundColor: theme.colors.accent }]} />
          </View>
          <Text variant="caption" color="textMuted" style={{ marginTop: spacing.sm }}>
            {affirmation}
          </Text>
        </Animated.View>
      ) : (
        <Animated.View entering={enterRise(2)} style={styles.progressWrap}>
          <Text variant="quote" color="textSecondary" align="center">
            {affirmation}
          </Text>
        </Animated.View>
      )}

      {/* Stats. */}
      <Animated.View
        entering={enterRise(3)}
        style={[
          styles.stats,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.border,
            experimental_backgroundImage: `linear-gradient(150deg, ${theme.colors.surfaceElevated} 0%, ${theme.colors.surface} 60%)`,
          },
        ]}
      >
        <Stat value={stats.total} label={garden.shared ? 'dias de vocês' : 'dias cuidando'} />
        <Stat value={stats.streak} label="seguidos" highlight />
        <Stat value={stats.best} label="recorde" />
      </Animated.View>

      {/* Ways to cultivate. */}
      <Animated.View entering={enterRise(4)} style={styles.careSection}>
        <HydrationRitual personId={person?.id ?? null} partnerName={nome} />
        <CareRitual partnerName={nome} partnerJoined={partnerJoined} />
      </Animated.View>

      <Animated.View entering={enterRise(5)} style={styles.achievements}>
        <AchievementShelf compact onOpen={() => router.push('/conquistas' as never)} />
      </Animated.View>

      <Animated.View entering={enterRise(6)} style={styles.links}>
        <Text variant="overline" color="textMuted" style={{ marginBottom: spacing.md, paddingHorizontal: spacing.lg }}>
          Cultivar
        </Text>
        <Link
          icon="message-circle"
          title="Pergunta do dia"
          subtitle="Os dois respondem antes da resposta aparecer."
          onPress={() => router.push('/pergunta')}
        />
        <Link
          icon="mail"
          title="Cartas e cápsulas"
          subtitle="Palavras para agora ou para uma data especial."
          onPress={() => router.push('/cartas')}
        />
        <Link
          icon="music"
          title="Música do dia"
          subtitle="Uma trilha escolhida por cada um."
          onPress={() => router.push('/musica')}
        />
        <Link
          icon="heart"
          title="Motivos pra amar"
          subtitle="Um baralho de razões pra deslizar."
          onPress={() => router.push('/motivos')}
        />
        <Link
          icon="sun"
          title="Gratidão do dia"
          subtitle="Três coisas boas, antes de dormir."
          onPress={() => router.push('/gratidao')}
        />
        <Link
          icon="bar-chart-2"
          title="Insights de humor"
          subtitle="O campo de girassóis do seu coração."
          onPress={() => router.push('/humor')}
        />
        <Link
          icon="link"
          title="Conexão dos aparelhos"
          subtitle="Convite, status e privacidade do casal."
          onPress={() => router.push('/conexao')}
        />
      </Animated.View>
    </Screen>
  );
}

function Stat({ value, label, highlight = false }: { value: number; label: string; highlight?: boolean }) {
  return (
    <View style={styles.stat}>
      <Text variant="title1" color={highlight ? 'accent' : 'text'}>
        {value}
      </Text>
      <Text variant="caption" color="textMuted" style={{ marginTop: 2 }}>
        {label}
      </Text>
    </View>
  );
}

function Link({
  icon,
  title,
  subtitle,
  onPress,
}: {
  icon: IconName;
  title: string;
  subtitle: string;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <PressableScale
      onPress={() => {
        haptics.tap();
        onPress();
      }}
      haptic={false}
      accessibilityLabel={title}
    >
      <View style={[styles.link, { borderTopColor: theme.colors.border }]}>
        <View style={[styles.glyph, { backgroundColor: theme.colors.accentSoft }]}>
          <Icon name={icon} size={18} color="accent" />
        </View>
        <View style={{ flex: 1 }}>
          <Text variant="callout" color="text">
            {title}
          </Text>
          <Text variant="subhead" color="textMuted" style={{ marginTop: 2 }}>
            {subtitle}
          </Text>
        </View>
        <Icon name="chevron-right" size={20} color="textMuted" />
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: spacing.lg, marginTop: spacing.md, marginBottom: spacing.sm },
  stage: {
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: spacing.md,
    paddingVertical: spacing.xl,
    borderRadius: radius.xl,
    borderCurve: 'continuous',
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  stageOrbit: {
    position: 'absolute',
    width: 420,
    height: 420,
    borderRadius: 210,
    borderWidth: StyleSheet.hairlineWidth,
  },
  glowField: { position: 'absolute' },
  progressWrap: { paddingHorizontal: spacing.lg, marginTop: spacing.xs, marginBottom: spacing.xxl },
  track: { height: spacing.sm, borderRadius: radius.pill, overflow: 'hidden' },
  fill: { height: spacing.sm, borderRadius: radius.pill },
  stats: {
    flexDirection: 'row',
    marginHorizontal: spacing.lg,
    marginBottom: spacing.xxl,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.xl,
    borderCurve: 'continuous',
    borderWidth: StyleSheet.hairlineWidth,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  careSection: { paddingHorizontal: spacing.lg, marginBottom: spacing.xxl, gap: spacing.lg },
  achievements: { paddingHorizontal: spacing.lg, marginBottom: spacing.xxl },
  links: { marginBottom: spacing.xl },
  link: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  glyph: { width: 42, height: 42, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
});
