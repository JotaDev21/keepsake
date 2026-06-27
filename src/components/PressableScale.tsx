import type { ReactNode } from 'react';
import { Pressable, type GestureResponderEvent, type StyleProp, type ViewStyle } from 'react-native';
import Animated from 'react-native-reanimated';

import { usePressScale } from '@/animations';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface PressableScaleProps {
  children?: ReactNode;
  onPress?: (e: GestureResponderEvent) => void;
  onLongPress?: (e: GestureResponderEvent) => void;
  style?: StyleProp<ViewStyle>;
  /** Scale at full press. */
  scaleTo?: number;
  /** Haptic on press-in: true → light tap, custom fn, or false. */
  haptic?: boolean | (() => void);
  disabled?: boolean;
  hitSlop?: number;
  accessibilityLabel?: string;
  accessibilityRole?: 'button' | 'link' | 'imagebutton';
}

/**
 * Pressable that breathes inward on touch (scale + haptic). The shared press
 * response for buttons, cards, tiles — anything tappable.
 */
export function PressableScale({
  children,
  onPress,
  onLongPress,
  style,
  scaleTo,
  haptic,
  disabled = false,
  hitSlop,
  accessibilityLabel,
  accessibilityRole = 'button',
}: PressableScaleProps) {
  const { animatedStyle, onPressIn, onPressOut } = usePressScale({
    to: scaleTo,
    haptic,
    disabled,
  });

  return (
    <AnimatedPressable
      disabled={disabled}
      onPress={onPress}
      onLongPress={onLongPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      hitSlop={hitSlop}
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel}
      style={[style, animatedStyle]}
    >
      {children}
    </AnimatedPressable>
  );
}
