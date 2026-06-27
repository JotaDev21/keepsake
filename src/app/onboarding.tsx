import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { enterRise } from '@/animations';
import { AccentPicker, Button, Icon, PressableScale, Text, TextField } from '@/components';
import { palette, useAccent, useTheme } from '@/design';
import { pickImage } from '@/lib/imagePicker';
import { saveMedia } from '@/lib/media';
import { usePersonStore } from '@/stores/usePersonStore';

/** First run — create the dedicated person. Gentle, essentials only. */
export default function Onboarding() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { setAccent } = useAccent();
  const createPerson = usePersonStore((s) => s.createPerson);

  const [nome, setNome] = useState('');
  const [apelido, setApelido] = useState('');
  const [accent, setLocalAccent] = useState<string>(palette.amber);
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
    if (!nome.trim() || saving) return;
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
      // The route guard flips to the tabs automatically.
    } catch (e) {
      console.warn('ev: falha ao criar pessoa', e);
      setSaving(false);
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background, paddingTop: insets.top }]}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Animated.View entering={enterRise(0)}>
          <Text variant="overline" color="accent">
            Bem-vindo
          </Text>
          <Text variant="display" color="text" style={{ marginTop: 8 }}>
            Por quem é{'\n'}este lugar?
          </Text>
          <Text variant="serif" color="textSecondary" style={{ marginTop: 12 }}>
            Um espaço só dela. Comece pelo essencial — o resto dá pra completar depois, com calma.
          </Text>
        </Animated.View>

        <Animated.View entering={enterRise(1)} style={{ marginTop: 32 }}>
          <PressableScale
            onPress={chooseCover}
            accessibilityLabel="Escolher uma foto"
            style={[styles.cover, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
          >
            {coverUri ? (
              <Image source={coverUri} style={StyleSheet.absoluteFill} contentFit="cover" />
            ) : (
              <View style={styles.coverEmpty}>
                <Icon name="image" size={22} color="textMuted" />
                <Text variant="subhead" color="textMuted" style={{ marginTop: 8 }}>
                  Escolher uma foto
                </Text>
              </View>
            )}
          </PressableScale>

          <View style={{ marginTop: 24 }}>
            <TextField label="Nome" placeholder="O nome dela" value={nome} onChangeText={setNome} />
            <TextField
              label="Apelido (opcional)"
              placeholder="Como você a chama"
              value={apelido}
              onChangeText={setApelido}
            />
            <Text variant="overline" color="textMuted" style={{ marginBottom: 12 }}>
              A cor dela
            </Text>
            <AccentPicker value={accent} onChange={onAccent} />
          </View>
        </Animated.View>

        <Animated.View entering={enterRise(2)} style={{ marginTop: 36 }}>
          <Button
            label="Começar"
            icon="arrow-right"
            onPress={begin}
            disabled={!nome.trim()}
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
  content: { padding: 24 },
  cover: {
    height: 180,
    borderRadius: 22,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverEmpty: { alignItems: 'center' },
});
