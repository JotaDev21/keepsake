import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated from 'react-native-reanimated';

import { enterRise } from '@/animations';
import {
  Button,
  Card,
  Chip,
  MoodSelector,
  PetalBurst,
  PressableScale,
  Screen,
  ScreenHeader,
  SunflowerMark,
  Text,
  TextField,
} from '@/components';
import { radius, spacing, useTheme, withAlpha } from '@/design';
import { getCachedReading, weeklyReading } from '@/lib/ai';
import { dayAgeLabel } from '@/lib/dates';
import { computeStats } from '@/lib/garden';
import { haptics } from '@/lib/haptics';
import { feelingTags, moodColor, moodScale, startOfDay } from '@/lib/mood';
import { usePersonStore } from '@/stores/usePersonStore';
import { useMoodStore } from '@/stores/useMoodStore';
import { useSyncStore } from '@/stores/useSyncStore';

const COLS = 7;
const CELL_GAP = 8;
const HISTORY_DAYS = 42;
const DAY = 86400000;
/** Partner moods older than this stop being shown — silence over stale news. */
const PARTNER_MOOD_MAX_AGE = 7 * DAY;

const moodLabel = (key: string | null) => moodScale.find((m) => m.key === key)?.label ?? '—';

export default function HumorScreen() {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const person = usePersonStore((s) => s.person);
  const today = useMoodStore((s) => s.today);
  const history = useMoodStore((s) => s.history);
  const allDays = useMoodStore((s) => s.allDays);
  const load = useMoodStore((s) => s.load);
  const save = useMoodStore((s) => s.save);
  const syncStatus = useSyncStore((s) => s.status);
  const partnerJoined = useSyncStore((s) => s.partnerJoined);
  const partnerMood = useSyncStore((s) => s.partnerMood);

  const [humor, setHumor] = useState<number | null>(null);
  const [intensidade, setIntensidade] = useState(3);
  const [nota, setNota] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [burst, setBurst] = useState(0);
  const [reading, setReading] = useState<string | null>(() => getCachedReading());
  const [readingLoading, setReadingLoading] = useState(false);
  const [readingFailed, setReadingFailed] = useState(false);

  const onReading = async () => {
    if (readingLoading) return;
    haptics.tap();
    setReadingLoading(true);
    setReadingFailed(false);
      const text = await weeklyReading(history, person?.nome ?? 'essa pessoa');
    setReadingLoading(false);
    if (text) {
      setReading(text);
      haptics.success();
    } else {
      setReadingFailed(true);
    }
  };

  useEffect(() => {
    if (person) load(person.id);
  }, [person, load]);

  // Prefill from today's saved entry.
  useEffect(() => {
    if (today) {
      setHumor(moodScale.findIndex((m) => m.key === today.humor));
      setIntensidade(today.intensidade);
      setNota(today.nota ?? '');
      setTags(today.tags);
    }
  }, [today]);

  const byDay = useMemo(() => {
    const map = new Map<number, (typeof history)[number]>();
    history.forEach((e) => map.set(e.dia, e));
    return map;
  }, [history]);

  const days = useMemo(() => {
    const base = startOfDay();
    return Array.from({ length: HISTORY_DAYS }, (_, i) => base - (HISTORY_DAYS - 1 - i) * DAY);
  }, []);

  const insights = useMemo(() => {
    // Top mood / average intensity read the recent window ("como TEM sido");
    // count and streak are lifetime — a 100-day run must say 100.
    const tally = new Map<string, number>();
    let sumI = 0;
    history.forEach((e) => {
      tally.set(e.humor, (tally.get(e.humor) ?? 0) + 1);
      sumI += e.intensidade;
    });
    let topKey: string | null = null;
    let topN = 0;
    tally.forEach((v, k) => {
      if (v > topN) {
        topN = v;
        topKey = k;
      }
    });
    // Streak walks real calendar days — a DST shift never breaks a run unfairly.
    const { streak, total } = computeStats(allDays, startOfDay());
    return { count: total, topKey: topKey as string | null, avg: history.length ? sumI / history.length : 0, streak };
  }, [history, allDays]);

  const topLabel = moodLabel(insights.topKey);

  const nome = person?.nome ?? 'a outra pessoa';
  const partnerMoodFresh = partnerMood != null && startOfDay() - partnerMood.dia < PARTNER_MOOD_MAX_AGE;
  const partnerMoodToday = partnerMood != null && partnerMood.dia === startOfDay();
  const selectedMoodColor = humor == null ? theme.colors.accent : moodScale[humor].color;

  const inner = width - spacing.lg * 2 - spacing.lg * 2;
  const cell = (inner - CELL_GAP * (COLS - 1)) / COLS;
  const toggleTag = (key: string) =>
    setTags((prev) => (prev.includes(key) ? prev.filter((t) => t !== key) : [...prev, key]));

  const onSave = async () => {
    if (humor == null || !person || saving) return;
    setSaving(true);
    try {
      await save(person.id, {
        dia: startOfDay(),
        humor: moodScale[humor].key,
        intensidade,
        nota: nota.trim() || null,
        tags,
      });
      // Guardado — um sim sem palavras: pétalas e um pulso quente.
      haptics.success();
      setBurst((b) => b + 1);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen scroll>
      <ScreenHeader title="Humor" subtitle="O clima emocional, dia após dia." style={styles.header} />

      <Animated.View entering={enterRise(0)} style={styles.section}>
        <MoodSelector options={moodScale} value={humor} onChange={setHumor} large />
      </Animated.View>

      {humor != null ? (
        <Animated.View
          entering={enterRise(1)}
          style={[
            styles.ritualPanel,
            {
              borderColor: withAlpha(selectedMoodColor, 0.34),
              backgroundColor: theme.colors.surface,
              experimental_backgroundImage: `linear-gradient(155deg, ${withAlpha(selectedMoodColor, 0.14)} 0%, ${theme.colors.surface} 38%, ${theme.colors.backgroundDeep} 160%)`,
              boxShadow: `0 18px 42px ${withAlpha(selectedMoodColor, 0.12)}`,
            },
          ]}
        >
          <View style={styles.detailHeading}>
            <View>
              <Text variant="overline" color="textMuted">
                intensidade
              </Text>
              <Text variant="title2" color="text" style={styles.detailTitle}>
                Quanto isso ocupa você?
              </Text>
            </View>
            <Text variant="display" style={{ color: selectedMoodColor }}>
              {intensidade}
            </Text>
          </View>
          <View style={[styles.intensity, { borderBottomColor: theme.colors.border }]}>
            {[1, 2, 3, 4, 5].map((n) => (
              <PressableScale
                key={n}
                onPress={() => setIntensidade(n)}
                haptic
                scaleTo={0.88}
                accessibilityLabel={`Intensidade ${n}`}
                style={styles.intensityHit}
              >
                <View
                  style={[
                    styles.segment,
                    {
                      height: 20 + n * 8,
                      backgroundColor:
                        n <= intensidade ? selectedMoodColor : theme.colors.borderStrong,
                      opacity: n <= intensidade ? 0.5 + n * 0.1 : 0.5,
                      boxShadow:
                        n === intensidade
                          ? `0 7px 18px ${withAlpha(selectedMoodColor, 0.3)}`
                          : undefined,
                    },
                  ]}
                />
              </PressableScale>
            ))}
          </View>
          <View style={styles.intensityLegend}>
            <Text variant="caption" color="textFaint">sussurro</Text>
            <Text variant="caption" color="textFaint">toma o peito</Text>
          </View>

          <Text variant="overline" color="textMuted" style={styles.feelingsLabel}>
            o que veio junto
          </Text>
          <View style={styles.tags}>
            {feelingTags.map((t) => (
              <Chip key={t.key} label={t.label} selected={tags.includes(t.key)} onPress={() => toggleTag(t.key)} />
            ))}
          </View>

          <View style={styles.noteWrap}>
            <TextField
              label="Uma nota (opcional)"
              value={nota}
              onChangeText={setNota}
              placeholder="O que pesou ou alegrou hoje"
              multiline
            />
          </View>

          <View style={styles.saveWrap}>
            <PetalBurst trigger={burst} radius={110} />
            <Button
              label={today ? 'Atualizar hoje' : 'Registrar hoje'}
              icon="check"
              onPress={onSave}
              loading={saving}
              fullWidth
              size="lg"
            />
          </View>
        </Animated.View>
      ) : null}

      {/* O clima dela — always labeled with when she felt it, never a stale "hoje". */}
      {syncStatus === 'ready' && partnerJoined && partnerMood && partnerMoodFresh ? (
        <Animated.View entering={enterRise(2)} style={styles.section}>
          <Card featured>
            <View style={styles.partnerRow}>
              <View
                style={[
                  styles.partnerOrb,
                  {
                    backgroundColor: withAlpha(moodColor(partnerMood.humor), 0.14),
                    borderColor: withAlpha(moodColor(partnerMood.humor), 0.72),
                    boxShadow: `0 10px 26px ${withAlpha(moodColor(partnerMood.humor), 0.24)}`,
                  },
                ]}
              >
                <View
                  style={[
                    styles.partnerOrbRing,
                    { borderColor: withAlpha(moodColor(partnerMood.humor), 0.4) },
                  ]}
                />
                <View
                  style={[
                    styles.partnerOrbCore,
                    {
                      backgroundColor: moodColor(partnerMood.humor),
                      transform: [{ scale: 0.72 + partnerMood.intensidade * 0.08 }],
                    },
                  ]}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text variant="overline" color={partnerMoodToday ? 'accent' : 'textMuted'}>
                  {partnerMoodToday ? `Hoje, ${nome}` : `${nome}, ${dayAgeLabel(partnerMood.dia)}`}
                </Text>
                <Text variant="title2" color="text" style={{ marginTop: spacing.xs }}>
                  {moodLabel(partnerMood.humor)}
                </Text>
                <Text variant="caption" color="textMuted" style={{ marginTop: spacing.xs }}>
                  intensidade {partnerMood.intensidade} de 5
                </Text>
              </View>
            </View>
          </Card>
        </Animated.View>
      ) : null}

      {/* Insights */}
      <Animated.View entering={enterRise(2)} style={styles.section}>
        <Text variant="overline" color="textMuted">
          seu ritmo
        </Text>
        <Text variant="title1" color="text" style={styles.insightsTitle}>
          Como tem sido
        </Text>
        <View style={styles.statsRow}>
          <StatTile value={String(insights.count)} label="registros" highlight />
          <StatTile value={String(insights.streak)} label="dias seguidos" />
        </View>
        <View style={styles.statsRow}>
          <StatTile value={topLabel} label="humor mais comum" dot={moodColor(insights.topKey)} />
          <StatTile value={insights.count ? insights.avg.toFixed(1) : '—'} label="intensidade média" />
        </View>
      </Animated.View>

      {/* Leitura da semana — a IA lê o clima recente com carinho, uma vez por semana. */}
      {history.length >= 3 ? (
        <Animated.View entering={enterRise(3)} style={styles.section}>
          <View style={styles.readingHeader}>
            <SunflowerMark size={14} />
            <Text variant="heading" color="text">
              Leitura da semana
            </Text>
          </View>
          <Card>
            {reading ? (
              <Text variant="serif" color="textSecondary">
                {reading}
              </Text>
            ) : (
              <>
                <Text variant="body" color="textMuted">
                  Uma leitura gentil dos seus últimos dias, escrita só pra você.
                </Text>
                <Text variant="caption" color="textFaint" style={{ marginTop: spacing.sm }}>
                  Ao tocar, só humor, intensidade e tags recentes vão para a IA. Suas notas nunca
                  saem deste aparelho.
                </Text>
                <Button
                  label={readingLoading ? 'Lendo os dias…' : 'Ler a semana'}
                  icon="book-open"
                  variant="secondary"
                  size="sm"
                  onPress={onReading}
                  loading={readingLoading}
                  style={{ marginTop: spacing.md }}
                />
                {readingFailed ? (
                  <Text variant="caption" color="textMuted" style={{ marginTop: spacing.sm }}>
                    Não deu pra ler agora. Tente de novo mais tarde.
                  </Text>
                ) : null}
              </>
            )}
          </Card>
        </Animated.View>
      ) : null}

      {/* Campo de girassóis — each day a bloom colored by its mood. */}
      <Animated.View entering={enterRise(3)} style={styles.section}>
        <Text variant="overline" color="textMuted">mapa emocional</Text>
        <Text variant="title1" color="text" style={styles.historyTitle}>
          As últimas seis semanas
        </Text>
        <Card>
          <View style={[styles.calendar, { gap: CELL_GAP }]}>
            {days.map((dia) => {
              const entry = byDay.get(dia);
              const bg = entry
                ? withAlpha(moodColor(entry.humor), 0.4 + (entry.intensidade / 5) * 0.6)
                : theme.colors.borderStrong;
              return (
                <View
                  key={dia}
                  style={{
                    width: cell,
                    height: cell,
                    borderRadius: cell / 2,
                    backgroundColor: bg,
                    borderWidth: entry ? StyleSheet.hairlineWidth : 0,
                    borderColor: entry ? withAlpha(moodColor(entry.humor), 0.9) : 'transparent',
                  }}
                />
              );
            })}
          </View>
          <View style={[styles.legend, { borderTopColor: theme.colors.border }]}>
            {moodScale.map((m) => (
              <View key={m.key} style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: m.color }]} />
                <Text variant="caption" color="textMuted">
                  {m.label}
                </Text>
              </View>
            ))}
          </View>
        </Card>
      </Animated.View>
    </Screen>
  );
}

function StatTile({
  value,
  label,
  highlight = false,
  dot,
}: {
  value: string;
  label: string;
  highlight?: boolean;
  dot?: string;
}) {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.statTile,
        {
          backgroundColor: highlight ? theme.colors.accentSoft : theme.colors.surface,
          borderColor: highlight ? theme.colors.accentEdge : theme.colors.border,
          experimental_backgroundImage: highlight
            ? `linear-gradient(145deg, ${theme.colors.accentSoft} 0%, ${theme.colors.surface} 130%)`
            : `linear-gradient(145deg, ${theme.colors.surfaceElevated} 0%, ${theme.colors.surface} 100%)`,
          boxShadow: highlight ? `0 10px 26px ${theme.colors.accentSoft}` : undefined,
        },
      ]}
    >
      <View style={styles.statValueRow}>
        {dot ? <View style={[styles.statDot, { backgroundColor: dot }]} /> : null}
        <Text variant="title2" color={highlight ? 'accent' : 'text'} numberOfLines={1}>
          {value}
        </Text>
      </View>
      <Text variant="caption" color="textMuted" style={{ marginTop: spacing.xs }}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { marginTop: spacing.sm, marginBottom: spacing.xxl },
  section: { marginBottom: spacing.xxl },
  ritualPanel: {
    marginBottom: spacing.xxl,
    padding: spacing.xl,
    borderRadius: radius.xl,
    borderCurve: 'continuous',
    borderWidth: StyleSheet.hairlineWidth,
  },
  detailHeading: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: spacing.lg,
  },
  detailTitle: { marginTop: spacing.xs },
  readingHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
  intensity: {
    height: 78,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.lg,
    paddingBottom: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  intensityHit: { flex: 1, height: 68, justifyContent: 'flex-end' },
  segment: { width: '100%', borderRadius: radius.sm, borderCurve: 'continuous' },
  intensityLegend: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: spacing.xs,
  },
  feelingsLabel: { marginTop: spacing.xxl, marginBottom: spacing.md },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  noteWrap: { marginTop: spacing.xl },
  saveWrap: { marginTop: spacing.sm },
  statsRow: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md },
  partnerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  partnerOrb: {
    width: 58,
    height: 58,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
  partnerOrbRing: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
  partnerOrbCore: { width: 13, height: 13, borderRadius: radius.pill },
  insightsTitle: { marginTop: spacing.xs, marginBottom: spacing.lg },
  statTile: {
    flex: 1,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    borderCurve: 'continuous',
    borderWidth: StyleSheet.hairlineWidth,
  },
  statValueRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  statDot: { width: 12, height: 12, borderRadius: radius.pill },
  calendar: { flexDirection: 'row', flexWrap: 'wrap' },
  historyTitle: { marginTop: spacing.xs, marginBottom: spacing.lg },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.lg,
    marginTop: spacing.xl,
    paddingTop: spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  legendDot: { width: 10, height: 10, borderRadius: radius.pill },
});
