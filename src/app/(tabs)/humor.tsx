import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated from 'react-native-reanimated';

import { enterRise } from '@/animations';
import { Button, Card, Chip, MoodSelector, PressableScale, Screen, Text, TextField } from '@/components';
import { spacing, useTheme, withAlpha } from '@/design';
import { feelingTags, moodColor, moodScale, startOfDay } from '@/lib/mood';
import { usePersonStore } from '@/stores/usePersonStore';
import { useMoodStore } from '@/stores/useMoodStore';

const COLS = 7;
const CELL_GAP = 6;
const HISTORY_DAYS = 42;
const DAY = 86400000;

export default function HumorScreen() {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const person = usePersonStore((s) => s.person);
  const today = useMoodStore((s) => s.today);
  const history = useMoodStore((s) => s.history);
  const load = useMoodStore((s) => s.load);
  const save = useMoodStore((s) => s.save);

  const [humor, setHumor] = useState<number | null>(null);
  const [intensidade, setIntensidade] = useState(3);
  const [nota, setNota] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

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
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen scroll>
      <View style={styles.header}>
        <Text variant="title1" color="text">
          Humor
        </Text>
        <Text variant="subhead" color="textMuted" style={{ marginTop: 2 }}>
          O clima emocional, dia após dia.
        </Text>
      </View>

      <Animated.View entering={enterRise(0)} style={styles.section}>
        <MoodSelector options={moodScale} value={humor} onChange={setHumor} large />
      </Animated.View>

      {humor != null ? (
        <Animated.View entering={enterRise(1)} style={styles.section}>
          <Text variant="overline" color="textMuted" style={{ marginBottom: 12 }}>
            Intensidade
          </Text>
          <View style={styles.intensity}>
            {[1, 2, 3, 4, 5].map((n) => (
              <PressableScale
                key={n}
                onPress={() => setIntensidade(n)}
                haptic
                scaleTo={0.88}
                accessibilityLabel={`Intensidade ${n}`}
                style={[
                  styles.segment,
                  {
                    backgroundColor: n <= intensidade ? theme.colors.accent : theme.colors.surfaceElevated,
                  },
                ]}
              />
            ))}
          </View>

          <Text variant="overline" color="textMuted" style={{ marginTop: 24, marginBottom: 12 }}>
            Sentimentos
          </Text>
          <View style={styles.tags}>
            {feelingTags.map((t) => (
              <Chip key={t.key} label={t.label} selected={tags.includes(t.key)} onPress={() => toggleTag(t.key)} />
            ))}
          </View>

          <View style={{ marginTop: 24 }}>
            <TextField
              label="Uma nota (opcional)"
              value={nota}
              onChangeText={setNota}
              placeholder="O que pesou ou alegrou hoje"
              multiline
            />
          </View>

          <Button
            label={today ? 'Atualizar hoje' : 'Registrar hoje'}
            icon="check"
            onPress={onSave}
            loading={saving}
            fullWidth
            size="lg"
            style={{ marginTop: 8 }}
          />
        </Animated.View>
      ) : null}

      <Animated.View entering={enterRise(2)} style={styles.section}>
        <Text variant="heading" color="text" style={{ marginBottom: 12 }}>
          Últimas semanas
        </Text>
        <Card>
          <View style={[styles.calendar, { gap: CELL_GAP }]}>
            {days.map((dia) => {
              const entry = byDay.get(dia);
              const bg = entry
                ? withAlpha(moodColor(entry.humor), 0.35 + (entry.intensidade / 5) * 0.6)
                : theme.colors.surfaceElevated;
              return <View key={dia} style={{ width: cell, height: cell, borderRadius: 6, backgroundColor: bg }} />;
            })}
          </View>
          <View style={styles.legend}>
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

const styles = StyleSheet.create({
  header: { marginTop: 8, marginBottom: 24 },
  section: { marginBottom: 24 },
  intensity: { flexDirection: 'row', gap: 8 },
  segment: { flex: 1, height: 12, borderRadius: 6 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  calendar: { flexDirection: 'row', flexWrap: 'wrap' },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginTop: 18 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
});
