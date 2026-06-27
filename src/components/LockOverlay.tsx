import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/design';

import { Button } from './Button';
import { Icon } from './Icon';
import { Text } from './Text';

interface LockOverlayProps {
  onUnlock: () => void;
}

/** Full-screen biometric lock. Sits above everything until unlocked. */
export function LockOverlay({ onUnlock }: LockOverlayProps) {
  const theme = useTheme();
  return (
    <View style={[StyleSheet.absoluteFill, styles.root, { backgroundColor: theme.colors.backgroundDeep }]}>
      <View style={[styles.glyph, { backgroundColor: theme.colors.accentSoft }]}>
        <Icon name="lock" size={32} color="accent" />
      </View>
      <Text variant="title2" color="text" style={{ marginTop: 24 }}>
        memory ev
      </Text>
      <Text variant="subhead" color="textMuted" style={{ marginTop: 6 }}>
        Este lugar é só seu.
      </Text>
      <Button label="Desbloquear" icon="unlock" onPress={onUnlock} style={{ marginTop: 28 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { alignItems: 'center', justifyContent: 'center', zIndex: 100 },
  glyph: { width: 96, height: 96, borderRadius: 48, alignItems: 'center', justifyContent: 'center' },
});
