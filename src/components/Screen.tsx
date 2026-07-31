import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { spacing, useTheme } from '@/design';

import { useTabBarSpace } from './tabBarLayout';
import { Atmosphere } from './Atmosphere';

interface ScreenProps {
  children: ReactNode;
  /** Wrap content in a vertical ScrollView. */
  scroll?: boolean;
  /** Apply horizontal page padding (theme.spacing.lg). */
  padded?: boolean;
  /** Safe-area edges to inset. Bottom is handled by the tab dock. */
  edges?: readonly Edge[];
  /** Leave bottom space so content clears the grounded tab dock. */
  tabBarPadding?: boolean;
  contentContainerStyle?: StyleProp<ViewStyle>;
  style?: StyleProp<ViewStyle>;
}

/** The page shell: warm entardecer background, safe-area aware, optional scroll. */
export function Screen({
  children,
  scroll = false,
  padded = true,
  edges = ['top'],
  tabBarPadding = true,
  contentContainerStyle,
  style,
}: ScreenProps) {
  const theme = useTheme();
  const tabSpace = useTabBarSpace();

  const pad: ViewStyle = {
    paddingHorizontal: padded ? spacing.lg : 0,
    paddingBottom: tabBarPadding ? tabSpace : 0,
  };

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }, style]}>
      <Atmosphere />
      <SafeAreaView edges={edges} style={styles.fill}>
        {scroll ? (
          <ScrollView
            contentInsetAdjustmentBehavior="automatic"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[pad, contentContainerStyle]}
          >
            {children}
          </ScrollView>
        ) : (
          <View style={[styles.fill, pad, contentContainerStyle]}>{children}</View>
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  fill: { flex: 1 },
});
