import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { enterRise } from '@/animations';
import { AccentPicker, Atmosphere, Button, Icon, PressableScale, ScreenHeader, Text, TextField } from '@/components';
import { palette, radius, spacing, useAccent, useTheme } from '@/design';
import { pickImage } from '@/lib/imagePicker';
import { saveMedia } from '@/lib/media';
import { usePersonStore } from '@/stores/usePersonStore';
import { useSyncStore } from '@/stores/useSyncStore';

/** First run — name both sides so the same APK feels correct on either phone. */
export default function Onboarding() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { setAccent } = useAccent();
  const createPerson = usePersonStore((s) => s.createPerson);
  const saveMyProfile = useSyncStore((s) => s.saveMyProfile);

  const [ownerName, setOwnerName] = useState('');
  const [nome, setNome] = useState('');
  const [apelido, setApelido] = useState('');
  const [accent, setLocalAccent] = useState<string>(palette.sunflower);
  const [coverUri, setCoverUri] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const chooseCover = async () => {
    const uri = await pickImage();
    if (uri) setCoverUri(uri);
  };

  const onAccent = (hex: string) => {
    setLocalAccent(hex);
    setAccent(hex); // live preview
  };

  const begin = async () => {
    if (!ownerName.trim() || !nome.trim() || saving) return;
    setSaving(true);
    try {
      const coverFile = coverUri ? await saveMedia(coverUri, 'jpg') : null;
      await createPerson({
        nome: nome.trim(),
        apelido: apelido.trim() || null,
        bio: null,
        comoSeConheceram: null,
        coverFile,
        avatarFile: null,
        accent,
      });
      // This identity stays queued locally until the couple is connected.
      await saveMyProfile(ownerName.trim());
      // The route guard flips to the tabs automatically.
    } catch (e) {
      console.warn('ev: falha ao criar pessoa', e);
      setSaving(false);
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background, paddingTop: insets.top }]}>
      <Atmosphere />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xxxl }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Animated.View entering={enterRise(0)}>
          <ScreenHeader
            overline="Bem-vindo"
            title={'Duas pessoas.\nUm lugar entre vocês.'}
            subtitle="Cada celular guarda a outra pessoa. Primeiro, diga quem está deste lado e quem mora nas lembranças."
            size="hero"
          />
        </Animated.View>

        <Animated.View entering={enterRise(1)} style={styles.section}>
          <View style={styles.identityBlock}>
            <Text variant="overline" color="accent">Este aparelho é de</Text>
            <TextField
              label="Seu nome"
              placeholder="Como a outra pessoa chama você"
              value={ownerName}
              onChangeText={setOwnerName}
              autoCapitalize="words"
              maxLength={50}
            />
          </View>

          <Text variant="overline" color="accent" style={styles.personLabel}>
            Este espaço guarda
          </Text>
          <PressableScale
            onPress={chooseCover}
            accessibilityLabel="Escolher uma foto"
            style={[styles.coverFrame, theme.elevation.low, { backgroundColor: theme.colors.surface }]}
          >
            <View style={[styles.cover, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
              {coverUri ? (
                <Image source={coverUri} style={StyleSheet.absoluteFill} contentFit="cover" />
              ) : (
                <View style={styles.coverEmpty}>
                  <Icon name="image" size={22} color="textMuted" />
                  <Text variant="subhead" color="textMuted" style={styles.coverHint}>
                    Escolher uma foto
                  </Text>
                </View>
              )}
            </View>
          </PressableScale>

          <View style={styles.form}>
            <TextField label="Nome" placeholder="O nome da outra pessoa" value={nome} onChangeText={setNome} />
            <TextField
              label="Apelido (opcional)"
              placeholder="Como você chama essa pessoa"
              value={apelido}
              onChangeText={setApelido}
            />
            <Text variant="overline" color="textMuted" style={styles.accentLabel}>
              A cor desse vínculo
            </Text>
            <AccentPicker value={accent} onChange={onAccent} />
          </View>
        </Animated.View>

        <Animated.View entering={enterRise(2)} style={styles.section}>
          <Button
            label="Começar"
            icon="arrow-right"
            onPress={begin}
            disabled={!ownerName.trim() || !nome.trim()}
            loading={saving}
            fullWidth
            size="lg"
          />
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: spacing.lg, paddingTop: spacing.xl },
  section: { marginTop: spacing.xxl },
  identityBlock: { gap: spacing.md, marginBottom: spacing.xxl },
  personLabel: { marginBottom: spacing.md },
  coverFrame: { borderRadius: radius.xl },
  cover: {
    height: 180,
    borderRadius: radius.xl,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverEmpty: { alignItems: 'center' },
  coverHint: { marginTop: spacing.sm },
  form: { marginTop: spacing.xl },
  accentLabel: { marginBottom: spacing.md },
});
