import { useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated from 'react-native-reanimated';

import { enterRise } from '@/animations';
import { BackButton, Button, EmptyState, Icon, PetalBurst, PressableScale, ScreenHeader, Text, TextField } from '@/components';
import { radius as radiusTokens, spacing, useTheme } from '@/design';
import { formatDate } from '@/lib/format';
import { haptics } from '@/lib/haptics';
import { startOfDay } from '@/lib/mood';
import type { Gratitude } from '@/types/models';
import { usePersonStore } from '@/stores/usePersonStore';
import { useGratitudeStore } from '@/stores/useGratitudeStore';

const DAY = 86400000;

function dayLabel(dia: number): string {
  const today = startOfDay();
  if (dia === today) return 'Hoje';
  if (dia === today - DAY) return 'Ontem';
  return formatDate(new Date(dia));
}

export default function GratidaoScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const person = usePersonStore((s) => s.person);
  const items = useGratitudeStore((s) => s.items);
  const load = useGratitudeStore((s) => s.load);
  const add = useGratitudeStore((s) => s.add);
  const remove = useGratitudeStore((s) => s.remove);

  const [texto, setTexto] = useState('');
  const [burst, setBurst] = useState(0);

  useEffect(() => {
    if (person) load(person.id);
  }, [person, load]);

  const groups = useMemo(() => {
    const out: { dia: number; entries: Gratitude[] }[] = [];
    for (const g of items) {
      const last = out[out.length - 1];
      if (last && last.dia === g.dia) last.entries.push(g);
      else out.push({ dia: g.dia, entries: [g] });
    }
    return out;
  }, [items]);

  const onAdd = async () => {
    if (!person || !texto.trim()) return;
    await add(person.id, texto.trim());
    setTexto('');
    haptics.success();
    setBurst((b) => b + 1);
  };

  const onDelete = (g: Gratitude) => {
    if (!person) return;
    Alert.alert('Apagar', 'Remover esta gratidão?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Apagar', style: 'destructive', onPress: () => remove(person.id, g.id) },
    ]);
  };

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingTop: insets.top + 64, paddingHorizontal: spacing.lg, paddingBottom: insets.bottom + 40 }}
      >
        <Animated.View entering={enterRise(0)}>
          <ScreenHeader
            overline="Gratidão"
            title="Coisas boas de hoje"
            subtitle="Nomear o que aqueceu o dia faz o girassol crescer."
          />
        </Animated.View>

        <View style={styles.compose}>
          <PetalBurst trigger={burst} radius={120} />
          <TextField value={texto} onChangeText={setTexto} placeholder="Sou grato por…" multiline />
          <Button label="Guardar" icon="sun" onPress={onAdd} disabled={!texto.trim()} fullWidth />
        </View>

        {groups.length === 0 ? (
          <EmptyState
            icon="sun"
            title="Ainda nada guardado."
            message="Comece por uma coisa pequena."
            style={styles.empty}
          />
        ) : (
          groups.map((grp, gi) => (
            <Animated.View key={grp.dia} entering={enterRise(gi + 1)} style={styles.group}>
              <Text variant="overline" color="textMuted" style={{ marginBottom: spacing.md }}>
                {dayLabel(grp.dia)}
              </Text>
              {grp.entries.map((g) => (
                <PressableScale
                  key={g.id}
                  onLongPress={() => onDelete(g)}
                  haptic={false}
                  accessibilityLabel={g.texto}
                >
                  <View style={[styles.entry, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                    <View style={[styles.bullet, { backgroundColor: theme.colors.accentSoft }]}>
                      <Icon name="sun" size={14} color="accent" />
                    </View>
                    <Text variant="body" color="text" style={{ flex: 1 }}>
                      {g.texto}
                    </Text>
                  </View>
                </PressableScale>
              ))}
            </Animated.View>
          ))
        )}
      </ScrollView>

      <BackButton />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  compose: { position: 'relative', marginTop: spacing.xl, marginBottom: spacing.sm },
  empty: { marginTop: spacing.xxl },
  group: { marginTop: spacing.xxl },
  entry: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radiusTokens.md,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: spacing.sm,
  },
  bullet: { width: 30, height: 30, borderRadius: radiusTokens.pill, alignItems: 'center', justifyContent: 'center' },
});
