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
  ScreenHeader,
  Text,
  TextField,
} from '@/components';
import { palette, radius, spacing, useTheme } from '@/design';
import { pickImage } from '@/lib/imagePicker';
import { deleteMedia, mediaUri, saveMedia } from '@/lib/media';
import { haptics } from '@/lib/haptics';
import { syncReminders } from '@/lib/notifications';
import { usePersonStore } from '@/stores/usePersonStore';
import { useSyncStore } from '@/stores/useSyncStore';
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
  const [accent, setAccent] = useState(person?.accent ?? palette.sunflower);
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
      await useSyncStore.getState().syncSharedDates();
      // Dates may have changed — rebuild scheduled reminders in the background.
      syncReminders(person.id).catch(() => {});
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
        contentContainerStyle={{
          paddingTop: insets.top + spacing.huge,
          paddingBottom: insets.bottom + spacing.xxxl,
          paddingHorizontal: spacing.lg,
        }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <ScreenHeader title="Editar perfil" mark={false} style={styles.header} />

        <PressableScale
          onPress={chooseCover}
          accessibilityLabel="Trocar capa"
          style={[
            styles.cover,
            { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
            theme.elevation.low,
          ]}
        >
          {coverSource ? (
            <Image source={coverSource} style={[StyleSheet.absoluteFill, styles.coverFill]} contentFit="cover" />
          ) : (
            <View style={styles.center}>
              <Icon name="image" size={20} color="textMuted" />
              <Text variant="subhead" color="textMuted" style={styles.placeholderLabel}>
                Capa
              </Text>
            </View>
          )}
        </PressableScale>

        <PressableScale onPress={chooseAvatar} accessibilityLabel="Trocar foto" style={styles.avatarRow}>
          <View
            style={[
              styles.avatar,
              { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
              theme.elevation.low,
            ]}
          >
            {avatarSource ? (
              <Image source={avatarSource} style={[StyleSheet.absoluteFill, styles.avatarFill]} contentFit="cover" />
            ) : (
              <Icon name="user" size={24} color="textMuted" />
            )}
          </View>
          <Text variant="callout" color="accent">
            Trocar foto
          </Text>
        </PressableScale>

        <View style={styles.fields}>
          <TextField label="Nome" value={nome} onChangeText={setNome} placeholder="Nome" />
          <TextField label="Apelido" value={apelido} onChangeText={setApelido} placeholder="Apelido" />
        <TextField label="Bio" value={bio} onChangeText={setBio} placeholder="Uma frase sobre essa pessoa" multiline />
          <TextField
            label="Como nos conhecemos"
            value={como}
            onChangeText={setComo}
            placeholder="O começo de tudo"
            multiline
          />
          <Text variant="overline" color="accent" style={styles.accentLabel}>
              A cor desse vínculo
          </Text>
          <AccentPicker value={accent} onChange={setAccent} />
        </View>

          <SectionHeader title="Sobre essa pessoa" />
        {facts.map((f, i) => (
          <View
            key={i}
            style={[styles.group, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
          >
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
          <View
            key={i}
            style={[styles.group, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
          >
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
                trackColor={{ true: theme.colors.accent, false: theme.colors.borderStrong }}
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
          style={styles.save}
        />
      </ScrollView>

      <BackButton />
    </View>
  );
}

function SectionHeader({ title }: { title: string }) {
  const theme = useTheme();
  return (
    <View style={[styles.sectionHeader, { borderTopColor: theme.colors.border }]}>
      <Text variant="overline" color="accent">
        {title}
      </Text>
    </View>
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
  header: { marginBottom: spacing.xxl },
  // No overflow:hidden — it would clip the warm shadow on iOS; the
  // absolute-fill image carries the same radius instead.
  cover: {
    height: 170,
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverFill: { borderRadius: radius.xl },
  center: { alignItems: 'center' },
  placeholderLabel: { marginTop: spacing.xs },
  avatarRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.lg },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarFill: { borderRadius: 32 },
  fields: { marginTop: spacing.xl },
  accentLabel: { marginBottom: spacing.md },
  sectionHeader: {
    marginTop: spacing.xxl,
    marginBottom: spacing.lg,
    paddingTop: spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  group: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  groupHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.xs },
  save: { marginTop: spacing.xxl },
});
