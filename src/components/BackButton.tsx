import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { radius as radiusTokens, spacing, useTheme } from '@/design';
import { haptics } from '@/lib/haptics';

import { Icon } from './Icon';
import { PressableScale } from './PressableScale';

/** A warm circular back affordance for full-screen detail routes. */
export function BackButton() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const theme = useTheme();

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
        <View
          style={[
            styles.inner,
            theme.elevation.low,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
              borderRadius: radiusTokens.pill,
            },
          ]}
        >
          <Icon name="chevron-left" size={22} color="text" />
        </View>
      </PressableScale>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: spacing.lg, zIndex: 10 },
  inner: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
});
