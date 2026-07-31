import { useState } from 'react';
import { ScrollView, StyleSheet, Switch, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BackButton, Button, DatePickerField, ScreenHeader, Text, TextField } from '@/components';
import { spacing, useTheme } from '@/design';
import { polishLetter } from '@/lib/ai';
import { haptics } from '@/lib/haptics';
import { syncReminders } from '@/lib/notifications';
import { usePersonStore } from '@/stores/usePersonStore';
import { useLetterStore } from '@/stores/useLetterStore';
import { useSyncStore } from '@/stores/useSyncStore';

function oneYearFromNow(): Date {
  const d = new Date();
  d.setFullYear(d.getFullYear() + 1);
  return d;
}

export default function EscreverCarta() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const person = usePersonStore((s) => s.person);
  const createLetter = useLetterStore((s) => s.create);
  const partnerJoined = useSyncStore((s) => s.partnerJoined);

  const [titulo, setTitulo] = useState('');
  const [corpo, setCorpo] = useState('');
  const [isCapsule, setIsCapsule] = useState(false);
  const [abrirEm, setAbrirEm] = useState<Date>(oneYearFromNow);
  const [saving, setSaving] = useState(false);
  const [polishing, setPolishing] = useState(false);
  // The draft before the AI touched it — "desfazer" always brings it back.
  const [rascunho, setRascunho] = useState<string | null>(null);
  const [polishFailed, setPolishFailed] = useState(false);

  const nome = person?.nome ?? 'a outra pessoa';

  const onPolish = async () => {
    if (polishing || corpo.trim().length < 40) return;
    haptics.tap();
    setPolishing(true);
    setPolishFailed(false);
    const out = await polishLetter(corpo.trim(), nome);
    setPolishing(false);
    if (out) {
      setRascunho(corpo);
      setCorpo(out);
      haptics.success();
    } else {
      setPolishFailed(true);
    }
  };

  const onUndoPolish = () => {
    if (rascunho == null) return;
    haptics.tap();
    setCorpo(rascunho);
    setRascunho(null);
  };

  const save = async () => {
    if (!person || !corpo.trim() || saving) return;
    setSaving(true);
    try {
      await createLetter(person.id, {
        titulo: titulo.trim() || 'Sem título',
        corpo: corpo.trim(),
        abrirEm: isCapsule ? abrirEm.getTime() : null,
      });
      syncReminders(person.id);
      haptics.success();
      router.back();
    } catch (e) {
      console.warn('ev: falha ao salvar carta', e);
      setSaving(false);
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          paddingTop: insets.top + spacing.huge,
          paddingHorizontal: spacing.lg,
          paddingBottom: insets.bottom + spacing.xxxl,
        }}
      >
        <ScreenHeader title="Escrever" mark={false} style={{ marginBottom: spacing.xxl }} />

        <TextField label="Título" value={titulo} onChangeText={setTitulo} placeholder="Pra quando você sentir minha falta" />
        <TextField
          label="A carta"
          value={corpo}
          onChangeText={(t) => {
            setCorpo(t);
            setPolishFailed(false);
          }}
          placeholder="Escreva com calma…"
          multiline
        />

        {/* IA quieta: lapida o rascunho preservando a voz; um toque desfaz. */}
        {corpo.trim().length >= 40 ? (
          <View>
            <View style={styles.polishRow}>
              <Button
                label={polishing ? 'Lapidando…' : 'Lapidar com carinho'}
                icon="feather"
                variant="ghost"
                size="sm"
                onPress={onPolish}
                loading={polishing}
              />
              {rascunho != null ? (
                <Button label="Voltar ao meu rascunho" variant="ghost" size="sm" onPress={onUndoPolish} />
              ) : null}
            </View>
            <Text variant="caption" color="textFaint" align="center" style={styles.aiDisclosure}>
              Só ao tocar: este rascunho é enviado à IA para revisão. Nada é enviado enquanto você
              apenas escreve.
            </Text>
          </View>
        ) : null}
        {polishFailed ? (
          <Text variant="caption" color="textMuted" align="center">
            Não deu pra lapidar agora. Sua carta continua inteira aqui.
          </Text>
        ) : null}

        <View style={[styles.switchRow, { borderColor: theme.colors.border }]}>
          <View style={{ flex: 1 }}>
            <Text variant="callout" color="text">
              Transformar em cápsula
            </Text>
            <Text variant="subhead" color="textMuted" style={{ marginTop: 2 }}>
              Fica selada até a data que você escolher.
            </Text>
          </View>
          <Switch
            value={isCapsule}
            onValueChange={(v) => {
              haptics.tap();
              setIsCapsule(v);
            }}
            trackColor={{ true: theme.colors.accent, false: theme.colors.borderStrong }}
            thumbColor={theme.colors.text}
          />
        </View>

        {isCapsule ? (
          <View style={{ marginTop: spacing.lg }}>
            <DatePickerField label="Abrir em" value={abrirEm} onChange={setAbrirEm} />
          </View>
        ) : null}

        <Button
          label="Salvar"
          icon="check"
          onPress={save}
          loading={saving}
          disabled={!corpo.trim()}
          fullWidth
          size="lg"
          style={{ marginTop: spacing.xxl }}
        />

        {partnerJoined ? (
          <Text variant="caption" color="textMuted" align="center" style={{ marginTop: spacing.md }}>
            A carta chega no outro aparelho. Se for cápsula, só abre na data. 🌻
          </Text>
        ) : null}
      </ScrollView>

      <BackButton />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  polishRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, justifyContent: 'center' },
  aiDisclosure: { marginTop: spacing.xs, marginBottom: spacing.sm },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.lg,
    marginTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
