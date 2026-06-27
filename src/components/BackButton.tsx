import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { radius as radiusTokens } from '@/design';
import { haptics } from '@/lib/haptics';

import { GlassSurface } from './GlassSurface';
import { Icon } from './Icon';
import { PressableScale } from './PressableScale';

/** A floating glass back affordance for full-screen detail routes. */
export function BackButton() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <View style={[styles.wrap, { top: insets.top + 8 }]} pointerEvents="box-none">
      <PressableScale
        onPress={() => {
          haptics.tap();
          router.back();
        }}
        haptic={false}
        scaleTo={0.88}
        accessibilityLabel="Voltar"
      >
        <GlassSurface radius={radiusTokens.pill} intensity="strong" strong>
          <View style={styles.inner}>
            <Icon name="chevron-left" size={22} color="text" />
          </View>
        </GlassSurface>
      </PressableScale>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 16, zIndex: 10 },
  inner: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
});
