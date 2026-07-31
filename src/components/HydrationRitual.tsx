import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { radius, spacing, springs, useTheme, withAlpha } from '@/design';
import { dayKey } from '@/lib/garden';
import { haptics } from '@/lib/haptics';
import { startOfDay } from '@/lib/mood';
import { prefs } from '@/lib/prefs';
import { useAchievementStore } from '@/stores/useAchievementStore';
import { useSyncStore } from '@/stores/useSyncStore';
import { GLASS_ML, useWaterStore } from '@/stores/useWaterStore';

import { Icon } from './Icon';
import { Button } from './Button';
import { PetalBurst } from './PetalBurst';
import { PressableScale } from './PressableScale';
import { Text } from './Text';
import { TextField } from './TextField';

const GOALS = [1500, 2000, 2500] as const;
const VESSEL_FILL_HEIGHT = 126;

interface HydrationRitualProps {
  personId: number | null;
  partnerName: string;
}

export function HydrationRitual({ personId, partnerName }: HydrationRitualProps) {
  const theme = useTheme();
  const waterMl = useWaterStore((state) => state.todayMl);
  const addWater = useWaterStore((state) => state.add);
  const paired = useSyncStore((state) => state.paired);
  const partnerJoined = useSyncStore((state) => state.partnerJoined);
  const partnerWater = useSyncStore((state) => state.partnerWater);
  const sharingWater = useSyncStore((state) => state.sharingPreferences.water);
  const setSharing = useSyncStore((state) => state.setSharingPreference);
  const pushWater = useSyncStore((state) => state.pushWater);
  const sendNudge = useSyncStore((state) => state.sendNudge);
  const claim = useAchievementStore((state) => state.claim);
  const [goal, setGoal] = useState(() => prefs.getWaterGoalMl());
  const [customGoalOpen, setCustomGoalOpen] = useState(false);
  const [customGoal, setCustomGoal] = useState(() => String(prefs.getWaterGoalMl() / 1000).replace('.', ','));
  const [goalError, setGoalError] = useState<string | null>(null);
  const [burst, setBurst] = useState(0);
  const [nudgeSent, setNudgeSent] = useState(false);
  const today = startOfDay();
  const partnerToday = partnerWater?.dia === today ? partnerWater : null;
  const mineDone = waterMl >= goal;
  const partnerDone = partnerToday != null && partnerToday.ml >= partnerToday.goalMl;
  const together = partnerJoined && mineDone && partnerDone;

  useEffect(() => {
    if (!together) return;
    const key = String(dayKey(today));
    if (prefs.getCelebratedHydrationDay() !== key) {
      prefs.setCelebratedHydrationDay(key);
      haptics.success();
      setBurst((value) => value + 1);
    }
    void claim('agua_juntos', { dia: today });
  }, [claim, today, together]);

  const add = (delta: number) => {
    if (!personId) return;
    haptics.tap();
    void addWater(personId, delta);
  };

  const changeGoal = (nextGoal: number) => {
    setGoal(nextGoal);
    prefs.setWaterGoalMl(nextGoal);
    haptics.tap();
    if (sharingWater) void pushWater(today, waterMl, nextGoal);
  };

  const saveCustomGoal = () => {
    const liters = Number(customGoal.trim().replace(',', '.'));
    if (!Number.isFinite(liters) || liters < 0.5 || liters > 6) {
      setGoalError('Escolha uma meta entre 0,5 e 6 litros.');
      return;
    }
    const nextGoal = Math.round((liters * 1000) / 50) * 50;
    setGoalError(null);
    setCustomGoal(String(nextGoal / 1000).replace('.', ','));
    setCustomGoalOpen(false);
    changeGoal(nextGoal);
  };

  const enableSharing = async () => {
    if (await setSharing('water', true)) haptics.success();
  };

  const nudge = async () => {
    if (!(await sendNudge('agua'))) return;
    haptics.success();
    setNudgeSent(true);
    setTimeout(() => setNudgeSent(false), 2200);
  };

  const status = together
    ? 'Hoje vocês chegaram juntos.'
    : mineDone
      ? `${partnerName} ainda está a caminho.`
      : `${Math.max(0, goal - waterMl)} ml para a sua meta.`;

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.colors.surface,
          borderColor: together ? theme.colors.accentEdge : theme.colors.border,
          experimental_backgroundImage: [
            `radial-gradient(circle at 50% 18%, ${withAlpha(theme.colors.accentBloom, together ? 0.16 : 0.08)} 0%, transparent 48%)`,
            `linear-gradient(155deg, ${theme.colors.surfaceElevated} 0%, ${theme.colors.surface} 62%)`,
          ].join(','),
        },
      ]}
    >
      <PetalBurst trigger={burst} radius={170} />
      <View style={styles.heading}>
        <View style={styles.headingCopy}>
          <Text variant="overline" color="textMuted">Ritual da água</Text>
          <Text variant="title2" color="text" style={styles.title}>Dois corpos, o mesmo cuidado</Text>
        </View>
        <View style={[styles.todaySeal, { backgroundColor: together ? theme.colors.accentSoft : theme.colors.surfaceElevated }]}>
          <Icon name={together ? 'check' : 'droplet'} size={15} color="accent" />
        </View>
      </View>

      <View style={styles.vessels}>
        <WaterVessel label="Você" ml={waterMl} goal={goal} active />
        <View style={styles.meeting}>
          <View style={[styles.meetingLine, { backgroundColor: theme.colors.border }]} />
          <View style={[styles.meetingSeed, { backgroundColor: together ? theme.colors.accent : theme.colors.seed }]}>
            <Icon name={together ? 'heart' : 'plus'} size={12} color={together ? 'onAccent' : 'textMuted'} />
          </View>
          <View style={[styles.meetingLine, { backgroundColor: theme.colors.border }]} />
        </View>
        <WaterVessel
          label={partnerName}
          ml={partnerToday?.ml ?? 0}
          goal={partnerToday?.goalMl ?? 2000}
          privateValue={partnerToday == null}
          emptyLabel={paired ? 'privado' : 'conecte'}
        />
      </View>

      <Text variant="subhead" color={together ? 'accent' : 'textMuted'} align="center" style={styles.status}>
        {status}
      </Text>

      <View style={styles.actions}>
        <PressableScale
          onPress={() => add(-GLASS_ML)}
          disabled={waterMl <= 0}
          accessibilityLabel="Desfazer último copo"
          style={[
            styles.roundAction,
            {
              backgroundColor: theme.colors.surfaceElevated,
              borderColor: theme.colors.border,
              opacity: waterMl <= 0 ? 0.4 : 1,
            },
          ]}
        >
          <Icon name="minus" size={17} color="textSecondary" />
        </PressableScale>
        <PressableScale
          onPress={() => add(GLASS_ML)}
          haptic={false}
          accessibilityLabel="Adicionar 250 mililitros"
          style={[styles.primaryAction, { backgroundColor: theme.colors.accent }]}
        >
          <Icon name="plus" size={18} color="onAccent" />
          <View>
            <Text variant="callout" color="onAccent">Beber um copo</Text>
            <Text variant="caption" color="onAccent">+ {GLASS_ML} ml</Text>
          </View>
        </PressableScale>
        <PressableScale
          onPress={() => void nudge()}
          disabled={!partnerJoined}
          accessibilityLabel={`Lembrar ${partnerName} de beber água`}
          style={[
            styles.roundAction,
            {
              backgroundColor: theme.colors.surfaceElevated,
              borderColor: theme.colors.border,
              opacity: partnerJoined ? 1 : 0.4,
            },
          ]}
        >
          <Icon name={nudgeSent ? 'check' : 'send'} size={16} color="accent" />
        </PressableScale>
      </View>

      <View style={[styles.goalArea, { borderTopColor: theme.colors.border }]}>
        <Text variant="caption" color="textMuted">Sua meta</Text>
        <View style={styles.goalOptions}>
          {GOALS.map((item) => (
            <PressableScale
              key={item}
              onPress={() => changeGoal(item)}
              accessibilityLabel={`Definir meta em ${item} mililitros`}
              style={[
                styles.goalChip,
                {
                  backgroundColor: item === goal ? theme.colors.accentSoft : 'transparent',
                  borderColor: item === goal ? theme.colors.accentEdge : theme.colors.border,
                },
              ]}
            >
              <Text variant="caption" color={item === goal ? 'accent' : 'textMuted'}>
                {(item / 1000).toFixed(1).replace('.', ',')} L
              </Text>
            </PressableScale>
          ))}
          <PressableScale
            onPress={() => {
              setCustomGoal(String(goal / 1000).replace('.', ','));
              setGoalError(null);
              setCustomGoalOpen((value) => !value);
            }}
            accessibilityLabel="Definir uma meta personalizada"
            style={[
              styles.goalChip,
              {
                backgroundColor: !GOALS.includes(goal as (typeof GOALS)[number])
                  ? theme.colors.accentSoft
                  : 'transparent',
                borderColor: !GOALS.includes(goal as (typeof GOALS)[number])
                  ? theme.colors.accentEdge
                  : theme.colors.border,
              },
            ]}
          >
            <Text
              variant="caption"
              color={!GOALS.includes(goal as (typeof GOALS)[number]) ? 'accent' : 'textMuted'}
            >
              Outra
            </Text>
          </PressableScale>
        </View>
        {customGoalOpen ? (
          <View style={styles.customGoal}>
            <TextField
              label="Meta em litros"
              value={customGoal}
              onChangeText={setCustomGoal}
              placeholder="Ex.: 2,3"
              keyboardType="decimal-pad"
              returnKeyType="done"
              maxLength={4}
              onSubmitEditing={saveCustomGoal}
            />
            {goalError ? (
              <Text variant="caption" color="accent" style={styles.goalError}>
                {goalError}
              </Text>
            ) : null}
            <Button label="Guardar meta" icon="check" size="sm" fullWidth onPress={saveCustomGoal} />
          </View>
        ) : null}
      </View>

      {paired && !sharingWater ? (
        <PressableScale
          onPress={() => void enableSharing()}
          accessibilityLabel="Compartilhar seu progresso de água"
          style={[styles.consent, { backgroundColor: theme.colors.accentSoft, borderColor: theme.colors.accentEdge }]}
        >
          <Icon name="lock" size={15} color="accent" />
          <View style={styles.consentCopy}>
            <Text variant="callout" color="accent">Dividir meu progresso com {partnerName}</Text>
            <Text variant="caption" color="textMuted">Só total e meta de hoje. Nunca notas ou histórico.</Text>
          </View>
          <Icon name="chevron-right" size={18} color="accent" />
        </PressableScale>
      ) : null}
    </View>
  );
}

function WaterVessel({
  label,
  ml,
  goal,
  active = false,
  privateValue = false,
  emptyLabel = 'privado',
}: {
  label: string;
  ml: number;
  goal: number;
  active?: boolean;
  privateValue?: boolean;
  emptyLabel?: string;
}) {
  const theme = useTheme();
  const progress = useSharedValue(Math.min(1, ml / goal));

  useEffect(() => {
    progress.value = withSpring(Math.min(1, ml / goal), springs.gentle);
  }, [goal, ml, progress]);

  const fillStyle = useAnimatedStyle(() => ({
    height: progress.value * VESSEL_FILL_HEIGHT,
  }));

  return (
    <View style={styles.vesselColumn}>
      <Text variant="overline" color={active ? 'accent' : 'textMuted'} numberOfLines={1}>
        {label}
      </Text>
      <View style={[styles.vessel, { borderColor: active ? theme.colors.accentEdge : theme.colors.borderStrong }]}>
        <View style={[styles.vesselShine, { backgroundColor: theme.colors.surfaceHighlight }]} />
        {!privateValue ? (
          <Animated.View
            style={[
              styles.water,
              {
                backgroundColor: withAlpha(theme.colors.accentBloom, active ? 0.72 : 0.42),
                borderTopColor: theme.colors.accentEdge,
              },
              fillStyle,
            ]}
          >
            <View style={[styles.wave, { borderColor: withAlpha(theme.colors.textOnMedia, 0.36) }]} />
          </Animated.View>
        ) : (
          <View style={styles.privateMark}>
            <Icon name="lock" size={18} color="textFaint" />
          </View>
        )}
      </View>
      <Text variant="callout" color={privateValue ? 'textFaint' : 'text'}>
        {privateValue ? emptyLabel : `${(ml / 1000).toFixed(2).replace('.', ',').replace(/,?0+$/, '')} L`}
      </Text>
      <Text variant="caption" color="textFaint">
        de {(goal / 1000).toFixed(1).replace('.', ',')} L
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    position: 'relative',
    overflow: 'hidden',
    padding: spacing.lg,
    borderRadius: radius.xl,
    borderCurve: 'continuous',
    borderWidth: StyleSheet.hairlineWidth,
  },
  heading: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md },
  headingCopy: { flex: 1 },
  title: { marginTop: spacing.xs, maxWidth: 250 },
  todaySeal: { width: 40, height: 40, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  vessels: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: spacing.xl },
  vesselColumn: { width: 112, alignItems: 'center', gap: spacing.xs },
  vessel: {
    width: 82,
    height: 136,
    marginVertical: spacing.sm,
    borderRadius: radius.lg,
    borderCurve: 'continuous',
    borderWidth: 1,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  vesselShine: { position: 'absolute', zIndex: 2, top: spacing.md, left: spacing.md, width: 4, height: 58, borderRadius: radius.pill },
  water: { width: '100%', borderTopWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  wave: { position: 'absolute', top: -7, left: -8, width: 98, height: 14, borderRadius: 50, borderWidth: 1 },
  privateMark: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  meeting: { width: 38, alignItems: 'center', gap: spacing.sm },
  meetingLine: { width: StyleSheet.hairlineWidth, height: 36 },
  meetingSeed: { width: 28, height: 28, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  status: { marginTop: spacing.lg },
  actions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.md, marginTop: spacing.lg },
  roundAction: {
    width: 46,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
  primaryAction: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.pill,
  },
  goalArea: { marginTop: spacing.xl, paddingTop: spacing.lg, borderTopWidth: StyleSheet.hairlineWidth },
  goalOptions: { flexDirection: 'row', gap: spacing.xs, marginTop: spacing.sm },
  goalChip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
  customGoal: { marginTop: spacing.lg },
  goalError: { marginTop: -spacing.md, marginBottom: spacing.md },
  consent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.lg,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  consentCopy: { flex: 1, gap: 2 },
});
