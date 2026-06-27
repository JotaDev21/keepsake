import { useEffect } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { enterRise } from '@/animations';
import { BackButton, Button, Card, EmptyState, Icon, Text } from '@/components';
import { useTheme } from '@/design';
import { countdownLabel } from '@/lib/dates';
import { formatDate } from '@/lib/format';
import { usePersonStore } from '@/stores/usePersonStore';
import { useLetterStore } from '@/stores/useLetterStore';
import type { Letter } from '@/types/models';

export default function CartasScreen() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const person = usePersonStore((s) => s.person);
  const letters = useLetterStore((s) => s.letters);
  const load = useLetterStore((s) => s.load);

  useEffect(() => {
    if (person) load(person.id);
  }, [person, load]);

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: insets.top + 64, paddingHorizontal: 16, paddingBottom: insets.bottom + 110 }}
      >
        <View style={styles.header}>
          <Text variant="title1" color="text">
            Cartas & cápsulas
          </Text>
          <Text variant="subhead" color="textMuted" style={{ marginTop: 2 }}>
            Palavras pra ela — pra hoje ou pra um dia.
          </Text>
        </View>

        {letters.length === 0 ? (
          <EmptyState
            icon="mail"
            title="Nenhuma carta ainda."
            message="Escreva a primeira — pode ser pra abrir hoje ou virar uma cápsula com data."
            actionLabel="Escrever"
            onAction={() => router.push('/cartas/escrever')}
          />
        ) : (
          letters.map((l, i) => (
            <Animated.View key={l.id} entering={enterRise(i)} style={{ marginBottom: 12 }}>
              <LetterCard
                letter={l}
                onPress={() => router.push({ pathname: '/carta/[id]', params: { id: String(l.id) } })}
              />
            </Animated.View>
          ))
        )}
      </ScrollView>

      {letters.length > 0 ? (
        <View style={[styles.fabWrap, { bottom: insets.bottom + 20 }]} pointerEvents="box-none">
          <Button label="Escrever" icon="edit-3" onPress={() => router.push('/cartas/escrever')} />
        </View>
      ) : null}

      <BackButton />
    </View>
  );
}

function LetterCard({ letter, onPress }: { letter: Letter; onPress: () => void }) {
  const theme = useTheme();
  const isCapsule = letter.abrirEm != null;
  const locked = isCapsule && letter.abrirEm != null && letter.abrirEm > Date.now() && !letter.aberta;

  const status = locked
    ? `Abre ${countdownLabel(letter.abrirEm as number, false)}`
    : isCapsule
      ? letter.aberta
        ? 'Cápsula aberta'
        : 'Cápsula pronta'
      : formatDate(new Date(letter.criadoEm));

  return (
    <Card onPress={onPress} accessibilityLabel={letter.titulo}>
      <View style={styles.cardRow}>
        <View style={[styles.glyph, { backgroundColor: theme.colors.accentSoft }]}>
          <Icon name={locked ? 'lock' : 'mail'} size={18} color="accent" />
        </View>
        <View style={{ flex: 1 }}>
          <Text variant="title2" color="text" numberOfLines={1}>
            {letter.titulo}
          </Text>
          <Text variant="subhead" color="textMuted" style={{ marginTop: 2 }}>
            {status}
          </Text>
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { marginBottom: 24 },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  glyph: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  fabWrap: { position: 'absolute', right: 20 },
});
