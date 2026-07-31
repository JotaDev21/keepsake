import { StyleSheet, View } from 'react-native';

import { radius, spacing, useTheme } from '@/design';

import { Button } from './Button';
import { Atmosphere } from './Atmosphere';
import { SunflowerMark } from './SunflowerMark';
import { Text } from './Text';

interface LockOverlayProps {
  onUnlock?: () => void;
  /**
   * Privacy cover only: shown while the app is in the switcher / momentarily
   * inactive, so the OS snapshot never captures what's inside. No unlock UI.
   */
  cover?: boolean;
}

/** Full-screen biometric lock. Sits above everything until unlocked. */
export function LockOverlay({ onUnlock, cover = false }: LockOverlayProps) {
  const theme = useTheme();
  return (
    <View style={[StyleSheet.absoluteFill, styles.root, { backgroundColor: theme.colors.backgroundDeep }]}>
      <Atmosphere />
      <View style={[styles.portal, { borderColor: theme.colors.accentEdge, backgroundColor: theme.colors.accentSoft }, theme.elevation.high]}>
        <View style={[styles.portalRing, { borderColor: theme.colors.borderStrong }]} />
        <SunflowerMark size={54} />
      </View>
      <Text variant="display" color="text" style={styles.title}>
        memory ev
      </Text>
      {cover ? null : (
        <>
          <Text variant="subhead" color="textMuted" style={styles.subtitle}>
            Este lugar é de vocês.
          </Text>
          <Button label="Desbloquear" icon="unlock" onPress={onUnlock ?? (() => {})} style={styles.button} />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { alignItems: 'center', justifyContent: 'center', zIndex: 100, paddingHorizontal: spacing.xl },
  portal: {
    width: 136,
    height: 136,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
  portalRing: {
    position: 'absolute',
    width: 174,
    height: 174,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
  title: { marginTop: spacing.xxl },
  subtitle: { marginTop: spacing.sm },
  button: { marginTop: spacing.xl },
});
