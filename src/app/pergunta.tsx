import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { enterRise } from '@/animations';
import { BackButton, Button, Card, PetalBurst, ScreenHeader, SunflowerMark, Text, TextField } from '@/components';
import { spacing, useTheme } from '@/design';
import { haptics } from '@/lib/haptics';
import { startOfDay } from '@/lib/mood';
import { useAchievementStore } from '@/stores/useAchievementStore';
import { usePersonStore } from '@/stores/usePersonStore';
import { useQuestionStore } from '@/stores/useQuestionStore';
import { useSyncStore } from '@/stores/useSyncStore';

/**
 * Pergunta do dia — one question, two blind answers. Each side answers without
 * seeing the other; the moment both exist, they reveal together.
 */
export default function PerguntaScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const person = usePersonStore((s) => s.person);
  const pergunta = useQuestionStore((s) => s.pergunta);
  const minhaResposta = useQuestionStore((s) => s.minhaResposta);
  const load = useQuestionStore((s) => s.load);
  const answer = useQuestionStore((s) => s.answer);
  const partnerJoined = useSyncStore((s) => s.partnerJoined);
  const partnerAnswer = useSyncStore((s) => s.partnerAnswer);
  const claimAchievement = useAchievementStore((s) => s.claim);

  const [texto, setTexto] = useState('');
  const [saving, setSaving] = useState(false);
  const [burst, setBurst] = useState(0);
  const celebrated = useRef(false);

  const nome = person?.nome ?? 'a outra pessoa';

  useEffect(() => {
    if (person) load(person.id);
  }, [person, load]);

  const partnerToday = partnerAnswer != null && partnerAnswer.dia === startOfDay() ? partnerAnswer.resposta : null;
  const revealed = minhaResposta != null && partnerToday != null;

  // The reveal is a small ritual — once, when both answers meet.
  useEffect(() => {
    if (revealed && !celebrated.current) {
      celebrated.current = true;
      haptics.success();
      setBurst((b) => b + 1);
      void claimAchievement('resposta_encontro', { dia: startOfDay() });
    }
  }, [claimAchievement, revealed]);

  const onAnswer = async () => {
    if (!person || !texto.trim() || saving) return;
    setSaving(true);
    try {
      await answer(person.id, texto);
      haptics.medium();
      setTexto('');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.root}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            paddingTop: insets.top + spacing.huge,
            paddingHorizontal: spacing.lg,
            paddingBottom: insets.bottom + spacing.xxxl,
          }}
        >
          <ScreenHeader overline="Pergunta do dia" title="Uma pra vocês dois" style={styles.header} />

          <Animated.View entering={enterRise(0)}>
            <Text variant="display" color="text" style={styles.question}>
              {pergunta ?? '…'}
            </Text>
          </Animated.View>

          {minhaResposta == null ? (
            <Animated.View entering={enterRise(1)}>
              <TextField
                value={texto}
                onChangeText={setTexto}
              placeholder="Responda com calma — a outra pessoa só vê depois de responder também."
                multiline
                autoFocus
              />
              <Button
                label="Responder"
                icon="check"
                onPress={onAnswer}
                loading={saving}
                disabled={!texto.trim()}
                fullWidth
                size="lg"
                style={styles.answerBtn}
              />
              {partnerJoined && partnerToday != null ? (
                <Text variant="caption" color="accent" align="center" style={styles.hint}>
                  {nome} já respondeu. Falta você. 🌻
                </Text>
              ) : null}
            </Animated.View>
          ) : (
            <View style={styles.answers}>
              <PetalBurst trigger={burst} radius={150} />

              <Animated.View entering={enterRise(1)}>
                <Card>
                  <Text variant="overline" color="textMuted">
                    Você
                  </Text>
                  <Text variant="serif" color="text" style={styles.answerText}>
                    {minhaResposta}
                  </Text>
                </Card>
              </Animated.View>

              <Animated.View entering={enterRise(2)} style={styles.partnerBlock}>
                {revealed ? (
                  <Card featured>
                    <View style={styles.partnerHead}>
                      <SunflowerMark size={14} />
                      <Text variant="overline" color="accent">
                        {nome}
                      </Text>
                    </View>
                    <Text variant="serif" color="text" style={styles.answerText}>
                      {partnerToday}
                    </Text>
                  </Card>
                ) : (
                  <Card>
                    <Text variant="overline" color="textMuted">
                      {nome}
                    </Text>
                    <Text variant="body" color="textMuted" style={styles.answerText}>
                      {partnerJoined
                        ? `Quando ${nome} responder, as duas respostas se abrem juntas.`
                        : 'Conectem os aparelhos pra responderem juntos.'}
                    </Text>
                  </Card>
                )}
              </Animated.View>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      <BackButton />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { marginBottom: spacing.xl },
  question: { marginBottom: spacing.xxl },
  answerBtn: { marginTop: spacing.md },
  hint: { marginTop: spacing.md },
  answers: { position: 'relative', gap: spacing.md },
  partnerBlock: { marginTop: spacing.xs },
  partnerHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xs },
  answerText: { marginTop: spacing.sm },
});
