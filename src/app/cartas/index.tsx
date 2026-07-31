import { useEffect } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { enterRise } from '@/animations';
import { BackButton, Button, Card, EmptyState, Icon, ScreenHeader, SunflowerMark, Text } from '@/components';
import { radius, spacing, useTheme } from '@/design';
import { countdownLabel } from '@/lib/dates';
import { formatDate } from '@/lib/format';
import { useNow } from '@/lib/useNow';
import { usePersonStore } from '@/stores/usePersonStore';
import { useLetterStore } from '@/stores/useLetterStore';
import { useSyncStore } from '@/stores/useSyncStore';
import type { Letter } from '@/types/models';

export default function CartasScreen() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const person = usePersonStore((s) => s.person);
  const letters = useLetterStore((s) => s.letters);
  const load = useLetterStore((s) => s.load);
  // Reload when a letter arrives from her side while this screen is open.
  const lettersVersion = useSyncStore((s) => s.lettersVersion);

  useEffect(() => {
    if (person) load(person.id);
  }, [person, load, lettersVersion]);

  const nome = person?.nome ?? 'a outra pessoa';
  const now = useNow(30_000);
  const received = letters.filter((l) => l.direcao === 'recebida');
  const mine = letters.filter((l) => l.direcao === 'minha');

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: insets.top + spacing.huge,
          paddingHorizontal: spacing.lg,
          // Clearance for the floating "Escrever" button below.
          paddingBottom: insets.bottom + spacing.huge + spacing.xxxl,
        }}
      >
        <ScreenHeader
          title="Cartas & cápsulas"
          subtitle="Palavras entre vocês — pra hoje ou pra um dia."
          style={styles.header}
        />

        {letters.length === 0 ? (
          <EmptyState
            icon="mail"
            title="Nenhuma carta ainda."
            message="Escreva a primeira — pode ser pra abrir hoje ou virar uma cápsula com data."
            actionLabel="Escrever"
            onAction={() => router.push('/cartas/escrever')}
          />
        ) : (
          <>
            {received.length > 0 ? (
              <>
                <Text variant="overline" color="accent" style={styles.kicker}>
                  De {nome}
                </Text>
                {received.map((l, i) => (
                  <Animated.View key={l.id} entering={enterRise(i)} style={styles.cardGap}>
                    <LetterCard
                      letter={l}
                      now={now}
                      onPress={() => router.push({ pathname: '/carta/[id]', params: { id: String(l.id) } })}
                    />
                  </Animated.View>
                ))}
              </>
            ) : null}

            {mine.length > 0 ? (
              <>
                {received.length > 0 ? (
                  <Text variant="overline" color="textMuted" style={[styles.kicker, { marginTop: spacing.xl }]}>
                    Suas
                  </Text>
                ) : null}
                {mine.map((l, i) => (
                  <Animated.View key={l.id} entering={enterRise(received.length + i)} style={styles.cardGap}>
                    <LetterCard
                      letter={l}
                      now={now}
                      onPress={() => router.push({ pathname: '/carta/[id]', params: { id: String(l.id) } })}
                    />
                  </Animated.View>
                ))}
              </>
            ) : null}
          </>
        )}
      </ScrollView>

      {letters.length > 0 ? (
        <View style={[styles.fabWrap, { bottom: insets.bottom + spacing.xl }]} pointerEvents="box-none">
          <Button label="Escrever" icon="edit-3" onPress={() => router.push('/cartas/escrever')} />
        </View>
      ) : null}

      <BackButton />
    </View>
  );
}

function LetterCard({ letter, now, onPress }: { letter: Letter; now: number; onPress: () => void }) {
  const theme = useTheme();
  const isCapsule = letter.abrirEm != null;
  const locked = isCapsule && letter.abrirEm != null && letter.abrirEm > now && !letter.aberta;
  const received = letter.direcao === 'recebida';

  const base = locked
    ? `Abre ${countdownLabel(letter.abrirEm as number, false)}`
    : isCapsule
      ? letter.aberta
        ? 'Cápsula aberta'
        : 'Cápsula pronta'
      : formatDate(new Date(letter.criadoEm));
  // A quiet read-receipt for what you sent; never noisy.
  const status = !received && letter.lida ? `${base} · lida 🌻` : base;

  return (
    <Card
      onPress={onPress}
      accessibilityLabel={letter.titulo}
      // A touch of paper: letters rest one step lighter than the night around them.
      style={{ backgroundColor: theme.colors.surfaceElevated }}
    >
      <View style={styles.cardRow}>
        {received ? (
          // Her letters arrive signed with the sunflower.
          <View style={styles.glyph}>
            <SunflowerMark size={28} />
          </View>
        ) : (
          <View style={[styles.glyph, { backgroundColor: theme.colors.accentSoft }]}>
            <Icon name={locked ? 'lock' : 'mail'} size={18} color="accent" />
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Text variant="title2" color="text" numberOfLines={1}>
            {locked && received ? 'Uma cápsula selada' : letter.titulo}
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
  header: { marginBottom: spacing.xxl },
  kicker: { marginBottom: spacing.md },
  cardGap: { marginBottom: spacing.md },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  glyph: { width: 42, height: 42, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  fabWrap: { position: 'absolute', right: spacing.lg },
});
