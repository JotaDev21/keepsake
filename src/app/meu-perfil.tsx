import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  BackButton,
  Button,
  MemberAvatar,
  PressableScale,
  ScreenHeader,
  Text,
  TextField,
} from '@/components';
import { radius, spacing, useTheme } from '@/design';
import { haptics } from '@/lib/haptics';
import { pickIdentityAvatar } from '@/lib/imagePicker';
import { memberAvatarError } from '@/lib/member-profile';
import { deleteMedia, mediaUri, saveMedia } from '@/lib/media';
import { useSyncStore } from '@/stores/useSyncStore';

export default function MeuPerfilScreen() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const myProfile = useSyncStore((state) => state.myProfile);
  const saveMyProfile = useSyncStore((state) => state.saveMyProfile);

  const [name, setName] = useState(myProfile?.displayName ?? '');
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const chooseAvatar = async () => {
    const uri = await pickIdentityAvatar();
    if (uri) setAvatarUri(uri);
  };

  const save = async () => {
    const cleanName = name.trim();
    if (!cleanName || saving) return;
    setSaving(true);
    setError(null);
    let avatarFile: string | undefined;
    try {
      avatarFile = avatarUri ? await saveMedia(avatarUri, 'jpg') : undefined;
      if (avatarFile) {
        const avatarError = memberAvatarError(mediaUri(avatarFile));
        if (avatarError) {
          deleteMedia(avatarFile);
          setError(avatarError);
          setSaving(false);
          return;
        }
      }
      const accepted = await saveMyProfile(cleanName, avatarFile);
      if (!accepted) {
        if (avatarFile) deleteMedia(avatarFile);
        setError('Escreva o nome que deve aparecer para vocês.');
        setSaving(false);
        return;
      }
      haptics.success();
      router.back();
    } catch (cause) {
      console.warn('memory ev: salvar identidade falhou', cause);
      if (avatarFile) deleteMedia(avatarFile);
      setError('Não consegui guardar sua identidade agora.');
      setSaving(false);
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          gap: spacing.xxl,
          paddingTop: insets.top + spacing.huge,
          paddingHorizontal: spacing.lg,
          paddingBottom: insets.bottom + spacing.xxxl,
        }}
      >
        <ScreenHeader
          overline="Seu lado do vínculo"
          title="Como você aparece"
          subtitle="Só seu nome e sua foto atravessam para o outro aparelho."
        />

        <PressableScale
          onPress={chooseAvatar}
          accessibilityLabel="Escolher minha foto"
          style={[
            styles.portrait,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
            },
          ]}
        >
          <MemberAvatar
            name={name}
            uri={avatarUri ?? myProfile?.avatarUrl}
            size={92}
          />
          <View style={styles.portraitCopy}>
            <Text variant="callout" color="text">
              Sua foto
            </Text>
            <Text variant="caption" color="textMuted">
              Toque para escolher
            </Text>
          </View>
        </PressableScale>

        <View style={styles.fields}>
          <TextField
            label="Seu nome"
            value={name}
            onChangeText={setName}
            placeholder="Como a outra pessoa chama você?"
            maxLength={50}
            autoCapitalize="words"
          />
          <Text variant="caption" color="textMuted">
            O restante do seu diário continua local e privado.
          </Text>
        </View>

        {error ? (
          <Text variant="subhead" color="accent" align="center">
            {error}
          </Text>
        ) : null}

        <Button
          label="Guardar meu lado"
          icon="check"
          loading={saving}
          disabled={!name.trim()}
          fullWidth
          onPress={save}
        />
      </ScrollView>
      <BackButton />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  portrait: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    padding: spacing.lg,
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
  },
  portraitCopy: { gap: spacing.xs },
  fields: { gap: spacing.sm },
});
