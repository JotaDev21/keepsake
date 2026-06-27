import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BackButton, Button, Card, Icon, Text, TextField } from '@/components';
import { useTheme } from '@/design';
import { haptics } from '@/lib/haptics';
import { moodColor, moodScale } from '@/lib/mood';
import { usePersonStore } from '@/stores/usePersonStore';
import { useSyncStore } from '@/stores/useSyncStore';

const moodLabel = (key: string) => moodScale.find((m) => m.key === key)?.label ?? key;

export default function Conexao() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const person = usePersonStore((s) => s.person);
  const status = useSyncStore((s) => s.status);
  const paired = useSyncStore((s) => s.paired);
  const inviteCode = useSyncStore((s) => s.inviteCode);
  const partnerMood = useSyncStore((s) => s.partnerMood);
  const createInvite = useSyncStore((s) => s.createInvite);
  const joinWithCode = useSyncStore((s) => s.joinWithCode);

  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nome = person?.nome ?? 'ela';

  const onCreate = async () => {
    setBusy(true);
    setError(null);
    haptics.tap();
    const c = await createInvite();
    setBusy(false);
    if (!c) setError('Não consegui criar o convite. Tente de novo.');
    else haptics.success();
  };

  const onJoin = async () => {
    if (!code.trim()) return;
    setBusy(true);
    setError(null);
    haptics.tap();
    const ok = await joinWithCode(code);
    setBusy(false);
    if (!ok) setError('Código inválido.');
    else haptics.success();
  };

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingTop: insets.top + 64, paddingHorizontal: 16, paddingBottom: insets.bottom + 40 }}
      >
        <Text variant="title1" color="text" style={{ marginBottom: 8 }}>
          Conexão
        </Text>
        <Text variant="serif" color="textSecondary" style={{ marginBottom: 24 }}>
          Um app pra dois. Pareie com {nome} pra verem o humor um do outro.
        </Text>

        {status === 'unconfigured' ? (
          <Card>
            <Text variant="body" color="textMuted">
              A sincronização ainda não está configurada neste app.
            </Text>
          </Card>
        ) : paired ? (
          <>
            <Card featured>
              <View style={styles.row}>
                <Icon name="check-circle" size={20} color="accent" />
                <Text variant="callout" color="text">
                  Conectados
                </Text>
              </View>
              <Text variant="subhead" color="textMuted" style={{ marginTop: 10 }}>
                Código do casal
              </Text>
              <Text variant="hero" color="accent" style={styles.code}>
                {inviteCode}
              </Text>
            </Card>

            <Card style={{ marginTop: 12 }}>
              <Text variant="overline" color="textMuted">
                Humor de {nome}
              </Text>
              {partnerMood ? (
                <View style={[styles.row, { marginTop: 12 }]}>
                  <View style={[styles.dot, { backgroundColor: moodColor(partnerMood.humor) }]} />
                  <Text variant="title2" color="text">
                    {moodLabel(partnerMood.humor)}
                  </Text>
                </View>
              ) : (
                <Text variant="body" color="textMuted" style={{ marginTop: 8 }}>
                  Quando {nome} registrar, aparece aqui — na hora.
                </Text>
              )}
            </Card>
          </>
        ) : (
          <>
            <Card>
              <Text variant="heading" color="text">
                Criar um convite
              </Text>
              <Text variant="subhead" color="textMuted" style={{ marginTop: 4, marginBottom: 14 }}>
                Gere um código e mande pra {nome}.
              </Text>
              {inviteCode ? (
                <Text variant="hero" color="accent" style={[styles.code, { marginBottom: 14 }]}>
                  {inviteCode}
                </Text>
              ) : null}
              <Button label={inviteCode ? 'Gerar outro' : 'Criar convite'} icon="link" onPress={onCreate} loading={busy} />
            </Card>

            <Text variant="overline" color="textFaint" align="center" style={{ marginVertical: 18 }}>
              ou
            </Text>

            <Card>
              <Text variant="heading" color="text">
                Tenho um código
              </Text>
              <Text variant="subhead" color="textMuted" style={{ marginTop: 4, marginBottom: 14 }}>
                Cole o código que ela te mandou.
              </Text>
              <TextField value={code} onChangeText={setCode} placeholder="ABC123" autoCapitalize="characters" />
              <Button label="Conectar" icon="users" onPress={onJoin} loading={busy} disabled={!code.trim()} fullWidth />
            </Card>
          </>
        )}

        {error ? (
          <Text variant="subhead" color="accent" align="center" style={{ marginTop: 16 }}>
            {error}
          </Text>
        ) : null}
      </ScrollView>

      <BackButton />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dot: { width: 16, height: 16, borderRadius: 8 },
  code: { letterSpacing: 6, marginTop: 4 },
});
