import { useState } from 'react';
import { ScrollView, StyleSheet, Switch, View } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  AccentPicker,
  BackButton,
  Button,
  DatePickerField,
  Icon,
  PressableScale,
  Text,
  TextField,
} from '@/components';
import { palette, useTheme } from '@/design';
import { pickImage } from '@/lib/imagePicker';
import { deleteMedia, mediaUri, saveMedia } from '@/lib/media';
import { haptics } from '@/lib/haptics';
import { usePersonStore } from '@/stores/usePersonStore';
import type { FactDraft, ImportantDateDraft } from '@/types/models';

export default function EditarPerfil() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const person = usePersonStore((s) => s.person);
  const storedFacts = usePersonStore((s) => s.facts);
  const storedDates = usePersonStore((s) => s.dates);
  const saveProfile = usePersonStore((s) => s.saveProfile);

  const [nome, setNome] = useState(person?.nome ?? '');
  const [apelido, setApelido] = useState(person?.apelido ?? '');
  const [bio, setBio] = useState(person?.bio ?? '');
  const [como, setComo] = useState(person?.comoSeConheceram ?? '');
  const [accent, setAccent] = useState(person?.accent ?? palette.amber);
  const [coverTemp, setCoverTemp] = useState<string | null>(null);
  const [avatarTemp, setAvatarTemp] = useState<string | null>(null);
  const [facts, setFacts] = useState<FactDraft[]>(
    storedFacts.map((f) => ({ chave: f.chave, valor: f.valor })),
  );
  const [dates, setDates] = useState<ImportantDateDraft[]>(
    storedDates.map((d) => ({ titulo: d.titulo, data: d.data, recorrente: d.recorrente, tipo: d.tipo })),
  );
  const [saving, setSaving] = useState(false);

  if (!person) return null;

  const coverSource = coverTemp ?? (person.coverFile ? mediaUri(person.coverFile) : null);
  const avatarSource = avatarTemp ?? (person.avatarFile ? mediaUri(person.avatarFile) : null);

  const chooseCover = async () => {
    const uri = await pickImage();
    if (uri) setCoverTemp(uri);
  };
  const chooseAvatar = async () => {
    const uri = await pickImage();
    if (uri) setAvatarTemp(uri);
  };

  const setFact = (i: number, patch: Partial<FactDraft>) =>
    setFacts((prev) => prev.map((f, idx) => (idx === i ? { ...f, ...patch } : f)));
  const addFact = () => setFacts((prev) => [...prev, { chave: '', valor: '' }]);
  const removeFact = (i: number) => setFacts((prev) => prev.filter((_, idx) => idx !== i));

  const setDate = (i: number, patch: Partial<ImportantDateDraft>) =>
    setDates((prev) => prev.map((d, idx) => (idx === i ? { ...d, ...patch } : d)));
  const addDate = () =>
    setDates((prev) => [...prev, { titulo: '', data: Date.now(), recorrente: true, tipo: 'outro' }]);
  const removeDate = (i: number) => setDates((prev) => prev.filter((_, idx) => idx !== i));

  const onSave = async () => {
    if (saving) return;
    setSaving(true);
    let cover = person.coverFile;
    let avatar = person.avatarFile;
    try {
      if (coverTemp) cover = await saveMedia(coverTemp, 'jpg');
      if (avatarTemp) avatar = await saveMedia(avatarTemp, 'jpg');
      await saveProfile({
        core: {
          nome: nome.trim() || person.nome,
          apelido: apelido.trim() || null,
          bio: bio.trim() || null,
          comoSeConheceram: como.trim() || null,
          coverFile: cover,
          avatarFile: avatar,
          accent,
        },
        facts: facts
          .filter((f) => f.chave.trim() || f.valor.trim())
          .map((f) => ({ chave: f.chave.trim(), valor: f.valor.trim() })),
        dates: dates.filter((d) => d.titulo.trim()).map((d) => ({ ...d, titulo: d.titulo.trim() })),
      });
      haptics.success();
      router.back();
    } catch (e) {
      console.warn('ev: falha ao salvar perfil', e);
      // Remove freshly-copied files that never got persisted.
      if (coverTemp && cover && cover !== person.coverFile) deleteMedia(cover);
      if (avatarTemp && avatar && avatar !== person.avatarFile) deleteMedia(avatar);
      setSaving(false);
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + 64, paddingBottom: insets.bottom + 48, paddingHorizontal: 16 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text variant="title1" color="text" style={{ marginBottom: 24 }}>
          Editar perfil
        </Text>

        <PressableScale
          onPress={chooseCover}
          accessibilityLabel="Trocar capa"
          style={[styles.cover, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
        >
          {coverSource ? (
            <Image source={coverSource} style={StyleSheet.absoluteFill} contentFit="cover" />
          ) : (
            <View style={styles.center}>
              <Icon name="image" size={20} color="textMuted" />
              <Text variant="subhead" color="textMuted" style={{ marginTop: 6 }}>
                Capa
              </Text>
            </View>
          )}
        </PressableScale>

        <PressableScale onPress={chooseAvatar} accessibilityLabel="Trocar foto" style={styles.avatarRow}>
          <View style={[styles.avatar, { backgroundColor: theme.colors.surface, borderColor: theme.colors.background }]}>
            {avatarSource ? (
              <Image source={avatarSource} style={StyleSheet.absoluteFill} contentFit="cover" />
            ) : (
              <Icon name="user" size={24} color="textMuted" />
            )}
          </View>
          <Text variant="callout" color="accent">
            Trocar foto
          </Text>
        </PressableScale>

        <View style={{ marginTop: 20 }}>
          <TextField label="Nome" value={nome} onChangeText={setNome} placeholder="Nome" />
          <TextField label="Apelido" value={apelido} onChangeText={setApelido} placeholder="Apelido" />
          <TextField label="Bio" value={bio} onChangeText={setBio} placeholder="Uma frase sobre ela" multiline />
          <TextField
            label="Como nos conhecemos"
            value={como}
            onChangeText={setComo}
            placeholder="O começo de tudo"
            multiline
          />
          <Text variant="overline" color="textMuted" style={{ marginBottom: 12 }}>
            A cor dela
          </Text>
          <AccentPicker value={accent} onChange={setAccent} />
        </View>

        <SectionHeader title="Sobre ela" />
        {facts.map((f, i) => (
          <View key={i} style={[styles.group, { borderColor: theme.colors.border }]}>
            <View style={styles.groupHead}>
              <Text variant="overline" color="textFaint">
                Fato {i + 1}
              </Text>
              <RemoveButton onPress={() => removeFact(i)} />
            </View>
            <TextField value={f.chave} onChangeText={(t) => setFact(i, { chave: t })} placeholder="Título (ex.: Comida favorita)" />
            <TextField value={f.valor} onChangeText={(t) => setFact(i, { valor: t })} placeholder="Valor" />
          </View>
        ))}
        <Button label="Adicionar fato" icon="plus" variant="ghost" size="sm" onPress={addFact} />

        <SectionHeader title="Datas importantes" />
        {dates.map((d, i) => (
          <View key={i} style={[styles.group, { borderColor: theme.colors.border }]}>
            <View style={styles.groupHead}>
              <Text variant="overline" color="textFaint">
                Data {i + 1}
              </Text>
              <RemoveButton onPress={() => removeDate(i)} />
            </View>
            <TextField value={d.titulo} onChangeText={(t) => setDate(i, { titulo: t })} placeholder="Título (ex.: Aniversário)" />
            <DatePickerField label="Data" value={new Date(d.data)} onChange={(date) => setDate(i, { data: date.getTime() })} />
            <View style={styles.switchRow}>
              <Text variant="callout" color="textSecondary">
                Repete todo ano
              </Text>
              <Switch
                value={d.recorrente}
                onValueChange={(v) => setDate(i, { recorrente: v })}
                trackColor={{ true: theme.colors.accent, false: theme.colors.surfaceElevated }}
                thumbColor={theme.colors.text}
              />
            </View>
          </View>
        ))}
        <Button label="Adicionar data" icon="plus" variant="ghost" size="sm" onPress={addDate} />

        <Button
          label="Salvar"
          icon="check"
          onPress={onSave}
          loading={saving}
          fullWidth
          size="lg"
          style={{ marginTop: 32 }}
        />
      </ScrollView>

      <BackButton />
    </View>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <Text variant="heading" color="text" style={styles.sectionHeader}>
      {title}
    </Text>
  );
}

function RemoveButton({ onPress }: { onPress: () => void }) {
  return (
    <PressableScale onPress={onPress} haptic={() => haptics.tap()} scaleTo={0.9} accessibilityLabel="Remover">
      <Icon name="trash-2" size={18} color="textMuted" />
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  cover: {
    height: 170,
    borderRadius: 22,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: { alignItems: 'center' },
  avatarRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 14 },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionHeader: { marginTop: 36, marginBottom: 14 },
  group: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 18, padding: 16, marginBottom: 14 },
  groupHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
});
