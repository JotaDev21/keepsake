import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { springs, useTheme } from '@/design';
import { haptics } from '@/lib/haptics';

import { GlassSurface } from './GlassSurface';
import { Icon, type IconName } from './Icon';
import { PressableScale } from './PressableScale';
import { Text } from './Text';
import { TAB_BAR_BOTTOM_GAP, TAB_BAR_PILL_HEIGHT, TAB_BAR_SIDE_MARGIN } from './tabBarLayout';

const ICONS: Record<string, IconName> = {
  index: 'home',
  cofre: 'image',
  'linha-do-tempo': 'clock',
  humor: 'heart',
  perfil: 'user',
};

const INDICATOR_INSET = 10;

/**
 * Floating glass tab bar. A soft accent pill slides under the active tab with a
 * spring; each press gives a selection haptic and a tiny inward scale. The bar
 * floats over content (absolute) so screens scroll behind the blur.
 */
export function TabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [barWidth, setBarWidth] = useState(0);

  const count = state.routes.length;
  const itemWidth = barWidth > 0 ? barWidth / count : 0;
  const indicator = useSharedValue(state.index);

  useEffect(() => {
    indicator.value = withSpring(state.index, springs.gentle);
  }, [state.index, indicator]);

  const indicatorStyle = useAnimatedStyle(() => ({
    width: Math.max(0, itemWidth - INDICATOR_INSET * 2),
    transform: [{ translateX: indicator.value * itemWidth + INDICATOR_INSET }],
  }));

  return (
    <View
      pointerEvents="box-none"
      style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, 8) + TAB_BAR_BOTTOM_GAP }]}
    >
      <GlassSurface
        radius={theme.radius.xl}
        intensity="strong"
        strong
        style={[styles.bar, { marginHorizontal: TAB_BAR_SIDE_MARGIN }]}
      >
        <View style={styles.row} onLayout={(e) => setBarWidth(e.nativeEvent.layout.width)}>
          {itemWidth > 0 ? (
            <Animated.View
              pointerEvents="none"
              style={[
                styles.indicator,
                { backgroundColor: theme.colors.accentSoft, borderRadius: theme.radius.lg },
                indicatorStyle,
              ]}
            />
          ) : null}

          {state.routes.map((route, index) => {
            const focused = state.index === index;
            const { options } = descriptors[route.key];
            const label = typeof options.title === 'string' ? options.title : route.name;
            const iconName = ICONS[route.name] ?? 'circle';

            const onPress = () => {
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });
              if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
              haptics.selection();
            };

            return (
              <PressableScale
                key={route.key}
                onPress={onPress}
                haptic={false}
                scaleTo={0.9}
                accessibilityLabel={label}
                style={styles.item}
              >
                <Icon name={iconName} size={20} color={focused ? 'accent' : 'textMuted'} />
                <Text
                  variant="overline"
                  color={focused ? 'accent' : 'textFaint'}
                  style={styles.label}
                >
                  {label}
                </Text>
              </PressableScale>
            );
          })}
        </View>
      </GlassSurface>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  bar: { overflow: 'hidden' },
  row: { flexDirection: 'row', height: TAB_BAR_PILL_HEIGHT, alignItems: 'center' },
  indicator: { position: 'absolute', top: 9, bottom: 9, left: 0 },
  item: { flex: 1, height: '100%', alignItems: 'center', justifyContent: 'center', gap: 3 },
  label: { marginTop: 1 },
});
