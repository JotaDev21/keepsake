import { useState } from 'react';
import { ScrollView, StyleSheet, Switch, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BackButton, Button, DatePickerField, Text, TextField } from '@/components';
import { useTheme } from '@/design';
import { haptics } from '@/lib/haptics';
import { syncReminders } from '@/lib/notifications';
import { usePersonStore } from '@/stores/usePersonStore';
import { useLetterStore } from '@/stores/useLetterStore';

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

  const [titulo, setTitulo] = useState('');
  const [corpo, setCorpo] = useState('');
  const [isCapsule, setIsCapsule] = useState(false);
  const [abrirEm, setAbrirEm] = useState<Date>(oneYearFromNow);
  const [saving, setSaving] = useState(false);

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
        contentContainerStyle={{ paddingTop: insets.top + 64, paddingHorizontal: 16, paddingBottom: insets.bottom + 48 }}
      >
        <Text variant="title1" color="text" style={{ marginBottom: 24 }}>
          Escrever
        </Text>

        <TextField label="Título" value={titulo} onChangeText={setTitulo} placeholder="Pra quando você sentir minha falta" />
        <TextField
          label="A carta"
          value={corpo}
          onChangeText={setCorpo}
          placeholder="Escreva com calma…"
          multiline
        />

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
            trackColor={{ true: theme.colors.accent, false: theme.colors.surfaceElevated }}
            thumbColor={theme.colors.text}
          />
        </View>

        {isCapsule ? (
          <View style={{ marginTop: 16 }}>
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
          style={{ marginTop: 32 }}
        />
      </ScrollView>

      <BackButton />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 16,
    marginTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
