import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

import { spacing, useTheme } from '@/design';

import { useTabBarSpace } from './tabBarLayout';

interface ScreenProps {
  children: ReactNode;
  /** Wrap content in a vertical ScrollView. */
  scroll?: boolean;
  /** Apply horizontal page padding (theme.spacing.lg). */
  padded?: boolean;
  /** Safe-area edges to inset. Bottom is handled by the floating tab bar. */
  edges?: readonly Edge[];
  /** Leave bottom space so content clears the floating tab bar. */
  tabBarPadding?: boolean;
  /** Soft accent glow at the top for depth (on by default). */
  glow?: boolean;
  contentContainerStyle?: StyleProp<ViewStyle>;
  style?: StyleProp<ViewStyle>;
}

/** The page shell: deep gradient background + accent glow, safe-area aware. */
export function Screen({
  children,
  scroll = false,
  padded = true,
  edges = ['top'],
  tabBarPadding = true,
  glow = true,
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
      <LinearGradient
        colors={[theme.colors.backgroundDeep, theme.colors.background, theme.colors.backgroundDeep]}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      {glow ? (
        <LinearGradient
          colors={[theme.colors.accentSoft, 'transparent']}
          style={styles.glow}
          pointerEvents="none"
        />
      ) : null}

      <SafeAreaView edges={edges} style={styles.safe}>
        {scroll ? (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[pad, contentContainerStyle]}>
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
  safe: { flex: 1 },
  fill: { flex: 1 },
  glow: { position: 'absolute', top: 0, left: 0, right: 0, height: 280 },
});
