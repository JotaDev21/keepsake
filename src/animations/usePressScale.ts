import { useCallback } from 'react';
import {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  type AnimatedStyle,
} from 'react-native-reanimated';
import type { ViewStyle } from 'react-native';

import { springs } from '@/design';
import { haptics } from '@/lib/haptics';

interface PressScaleOptions {
  /** Scale at full press. Subtle by default. */
  to?: number;
  /** Haptic on press-in: true → light tap, or pass a custom trigger, or false. */
  haptic?: boolean | (() => void);
  /** Disable the interaction (no scale, no haptic). */
  disabled?: boolean;
}

interface PressScaleResult {
  animatedStyle: AnimatedStyle<ViewStyle>;
  onPressIn: () => void;
  onPressOut: () => void;
}

/**
 * The universal press response: every button and card breathes inward a touch
 * when touched, with a light haptic, then springs back. Runs on the UI thread.
 */
export function usePressScale(options: PressScaleOptions = {}): PressScaleResult {
  const { to = 0.96, haptic = true, disabled = false } = options;
  const scale = useSharedValue(1);

  const onPressIn = useCallback(() => {
    if (disabled) return;
    scale.value = withSpring(to, springs.press);
    if (haptic === true) haptics.tap();
    else if (typeof haptic === 'function') haptic();
  }, [disabled, to, haptic, scale]);

  const onPressOut = useCallback(() => {
    if (disabled) return;
    scale.value = withSpring(1, springs.press);
  }, [disabled, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return { animatedStyle, onPressIn, onPressOut };
}
