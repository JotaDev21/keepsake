import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { springs, useTheme } from '@/design';
import { haptics } from '@/lib/haptics';

import { Icon, type IconName } from './Icon';
import { PressableScale } from './PressableScale';

const ICONS: Record<string, IconName> = {
  index: 'home',
  cofre: 'image',
  'linha-do-tempo': 'clock',
  humor: 'heart',
  perfil: 'user',
};

const ITEM = 54;
const PAD = 7;

/**
 * Editorial floating pill: a solid, crisp tab bar centered above the content.
 * Icons only; the active one is lifted by an accent disc that slides on a spring.
 */
export function TabBar({ state, navigation }: BottomTabBarProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const indicator = useSharedValue(state.index);

  useEffect(() => {
    indicator.value = withSpring(state.index, springs.gentle);
  }, [state.index, indicator]);

  const indicatorStyle = useAnimatedStyle(() => ({ transform: [{ translateX: indicator.value * ITEM }] }));

  return (
    <View pointerEvents="box-none" style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, 10) + 12 }]}>
      <View style={[styles.pill, { backgroundColor: theme.colors.surfaceElevated, borderColor: theme.colors.border }]}>
        <Animated.View
          pointerEvents="none"
          style={[styles.indicator, { backgroundColor: theme.colors.accentSoft }, indicatorStyle]}
        />
        {state.routes.map((route, index) => {
          const focused = state.index === index;
          const iconName = ICONS[route.name] ?? 'circle';
          const onPress = () => {
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
            haptics.selection();
          };
          return (
            <PressableScale
              key={route.key}
              onPress={onPress}
              haptic={false}
              scaleTo={0.82}
              accessibilityLabel={route.name}
              style={styles.item}
            >
              <Icon name={iconName} size={22} color={focused ? 'accent' : 'textMuted'} />
            </PressableScale>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, bottom: 0, alignItems: 'center' },
  pill: {
    flexDirection: 'row',
    padding: PAD,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.45,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 16,
  },
  indicator: { position: 'absolute', top: PAD, left: PAD + 4, width: ITEM - 8, bottom: PAD, borderRadius: 999 },
  item: { width: ITEM, height: 46, alignItems: 'center', justifyContent: 'center' },
});
