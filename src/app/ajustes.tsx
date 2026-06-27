import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BackButton, Card, Icon, Text } from '@/components';
import { useTheme } from '@/design';
import { authenticate, canUseBiometrics } from '@/lib/auth';
import { haptics } from '@/lib/haptics';
import { prefs } from '@/lib/prefs';

export default function Ajustes() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [appLock, setAppLock] = useState(prefs.isAppLockEnabled());

  const toggleAppLock = async (value: boolean) => {
    haptics.tap();
    if (value) {
      const ok = await canUseBiometrics();
      if (!ok) {
        Alert.alert(
          'Biometria indisponível',
          'Cadastre uma digital ou o rosto nas configurações do aparelho para usar o bloqueio.',
        );
        return;
      }
      const authed = await authenticate();
      if (!authed) return;
      prefs.setAppLockEnabled(true);
      setAppLock(true);
    } else {
      prefs.setAppLockEnabled(false);
      setAppLock(false);
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: insets.top + 64, paddingHorizontal: 16, paddingBottom: insets.bottom + 40 }}
      >
        <Text variant="title1" color="text" style={{ marginBottom: 24 }}>
          Ajustes
        </Text>

        <Text variant="overline" color="textMuted" style={{ marginBottom: 12 }}>
          Privacidade
        </Text>
        <Card>
          <View style={styles.row}>
            <View style={[styles.glyph, { backgroundColor: theme.colors.accentSoft }]}>
              <Icon name="lock" size={18} color="accent" />
            </View>
            <View style={{ flex: 1 }}>
              <Text variant="callout" color="text">
                Bloqueio por biometria
              </Text>
              <Text variant="subhead" color="textMuted" style={{ marginTop: 2 }}>
                Pede sua digital ou rosto ao abrir o app.
              </Text>
            </View>
            <Switch
              value={appLock}
              onValueChange={toggleAppLock}
              trackColor={{ true: theme.colors.accent, false: theme.colors.surfaceElevated }}
              thumbColor={theme.colors.text}
            />
          </View>
        </Card>

        <Text variant="caption" color="textFaint" align="center" style={{ marginTop: 28 }}>
          memory ev · tudo fica no seu aparelho.
        </Text>
      </ScrollView>

      <BackButton />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  glyph: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
});
