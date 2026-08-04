import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { usePressScale } from '@/animations';
import { radius, spacing, springs, useTheme, withAlpha } from '@/design';
import { haptics } from '@/lib/haptics';

import { TAB_BAR_CONTENT_HEIGHT } from './tabBarLayout';
import { Icon, type IconName } from './Icon';
import { Text } from './Text';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const HIDDEN_ROUTES = new Set(['linha-do-tempo', 'humor']);

interface TabItemProps {
  route: string;
  label: string;
  focused: boolean;
  onPress: () => void;
}

function TabItem({ route, label, focused, onPress }: TabItemProps) {
  const theme = useTheme();
  const { animatedStyle, onPressIn, onPressOut } = usePressScale({ to: 0.91, haptic: false });
  const selected = useSharedValue(focused ? 1 : 0);

  useEffect(() => {
    selected.value = withSpring(focused ? 1 : 0, springs.gentle);
  }, [focused, selected]);

  const glyphStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(selected.value, [0, 1], [0, -3]) },
      { scale: interpolate(selected.value, [0, 1], [0.94, 1.08]) },
    ],
  }));
  const selectedStyle = useAnimatedStyle(() => ({
    opacity: selected.value,
    transform: [{ scaleX: interpolate(selected.value, [0, 1], [0.2, 1]) }],
  }));

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      accessibilityRole="tab"
      accessibilityLabel={label}
      accessibilityState={{ selected: focused }}
      style={[styles.item, animatedStyle]}
    >
      <Animated.View
        style={[
          styles.glyphWell,
          {
            borderColor: focused ? theme.colors.accentEdge : 'transparent',
            backgroundColor: focused ? withAlpha(theme.colors.accentBloom, 0.09) : 'transparent',
            boxShadow: focused ? `0 8px 20px ${theme.colors.accentGlow}` : undefined,
          },
          glyphStyle,
        ]}
      >
        <TabGlyph route={route} label={label} focused={focused} />
      </Animated.View>
      <Text
        variant="caption"
        numberOfLines={1}
        style={[
          styles.label,
          {
            color: focused ? theme.colors.text : theme.colors.textMuted,
            opacity: focused ? 1 : 0.72,
          },
        ]}
      >
        {label}
      </Text>
      <Animated.View
        pointerEvents="none"
        style={[styles.selectionLine, { backgroundColor: theme.colors.accent }, selectedStyle]}
      />
    </AnimatedPressable>
  );
}

function TabGlyph({ route, label, focused }: { route: string; label: string; focused: boolean }) {
  const theme = useTheme();
  const color = focused ? theme.colors.accent : theme.colors.textMuted;
  const iconByRoute: Partial<Record<string, IconName>> = {
    index: 'home',
    jardim: 'heart',
    cofre: 'image',
  };
  const icon = iconByRoute[route];
  if (icon) return <Icon name={icon} size={focused ? 21 : 20} color={color} />;

  return (
    <View style={[styles.monogramRing, { borderColor: color }]}>
      <Text variant="title2" style={[styles.monogram, { color }]}>
        {label.slice(0, 1).toLocaleUpperCase('pt-BR')}
      </Text>
    </View>
  );
}

export function TabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const visibleRoutes = state.routes.filter((route) => !HIDDEN_ROUTES.has(route.name));

  return (
    <View
      style={[
        styles.bar,
        {
          bottom: Math.max(insets.bottom, spacing.sm),
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
          boxShadow: theme.dark
            ? '0 18px 44px rgba(0, 0, 0, 0.62)'
            : '0 16px 36px rgba(55, 38, 12, 0.16)',
          experimental_backgroundImage: `linear-gradient(165deg, ${theme.colors.surfaceElevated} 0%, ${theme.colors.surface} 48%, ${theme.colors.backgroundDeep} 150%)`,
        },
      ]}
    >
      <View
        pointerEvents="none"
        style={[styles.topSheen, { backgroundColor: theme.colors.surfaceHighlight }]}
      />
      <View style={styles.row}>
        {visibleRoutes.map((route) => {
          const focused = state.routes[state.index]?.key === route.key;
          const { options } = descriptors[route.key];
          const label =
            typeof options.tabBarLabel === 'string'
              ? options.tabBarLabel
              : (options.title ?? route.name);
          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!focused && !event.defaultPrevented) {
              haptics.selection();
              navigation.navigate(route.name);
            }
          };

          return (
            <TabItem
              key={route.key}
              route={route.name}
              label={label}
              focused={focused}
              onPress={onPress}
            />
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    height: TAB_BAR_CONTENT_HEIGHT,
    borderRadius: radius.lg,
    borderCurve: 'continuous',
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    height: TAB_BAR_CONTENT_HEIGHT,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1,
  },
  glyphWell: {
    width: 42,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
  label: { fontSize: 10, lineHeight: 13 },
  selectionLine: {
    position: 'absolute',
    bottom: 1,
    width: 16,
    height: 2,
    borderRadius: radius.pill,
  },
  topSheen: {
    position: 'absolute',
    top: 0,
    left: radius.lg,
    right: radius.lg,
    height: StyleSheet.hairlineWidth,
  },
  monogramRing: {
    width: 25,
    height: 25,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
  monogram: { fontSize: 17, lineHeight: 20 },
});
