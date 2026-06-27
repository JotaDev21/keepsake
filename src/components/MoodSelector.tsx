import { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { radius as radiusTokens, springs, useTheme, withAlpha } from '@/design';
import { haptics } from '@/lib/haptics';

import { PressableScale } from './PressableScale';
import { Text } from './Text';

export interface MoodOption {
  label: string;
  color: string;
}

interface MoodSelectorProps {
  options: MoodOption[];
  /** Selected index, or null when nothing is chosen yet. */
  value: number | null;
  onChange: (index: number) => void;
  /** Larger dots + the chosen label in serif. */
  large?: boolean;
}

/**
 * Fluid mood picker. Picking a mood softly morphs the panel's background from
 * neutral into the mood's color (interpolated on the UI thread) with a soft
 * haptic — the small ritual of naming how today feels.
 */
export function MoodSelector({ options, value, onChange, large = false }: MoodSelectorProps) {
  const theme = useTheme();
  // `sel` tracks the selected index for hue morphing; `colored` cross-fades the
  // panel from neutral (0) to the mood color (1) so the FIRST pick doesn't sweep
  // through intermediate hues from a synthetic starting index.
  const sel = useSharedValue(value ?? 0);
  const colored = useSharedValue(value == null ? 0 : 1);
  const wasNull = useRef(value == null);

  useEffect(() => {
    if (value == null) {
      colored.value = withSpring(0, springs.gentle);
      wasNull.current = true;
      return;
    }
    if (wasNull.current) {
      sel.value = value; // snap to the picked index — no wrong-direction sweep
      colored.value = withSpring(1, springs.gentle);
      wasNull.current = false;
    } else {
      sel.value = withSpring(value, springs.gentle);
    }
  }, [value, sel, colored]);

  const inputRange = options.map((_, i) => i);
  const softColors = options.map((o) => withAlpha(o.color, 0.2));

  const panelStyle = useAnimatedStyle(() => {
    const moodColor = interpolateColor(sel.value, inputRange, softColors);
    return {
      backgroundColor: interpolateColor(
        colored.value,
        [0, 1],
        [theme.colors.surfaceElevated, moodColor],
      ),
    };
  });

  const dotSize = large ? 30 : 22;

  return (
    <Animated.View style={[styles.panel, { borderRadius: radiusTokens.lg }, panelStyle]}>
      <View style={[styles.row, large ? { gap: 6 } : null]}>
        {options.map((o, i) => {
          const active = value === i;
          return (
            <PressableScale
              key={o.label}
              onPress={() => {
                onChange(i);
                haptics.soft();
              }}
              haptic={false}
              scaleTo={0.85}
              accessibilityLabel={o.label}
            >
              <View style={[styles.dotWrap, { width: dotSize + 14, height: dotSize + 14 }]}>
                <View
                  style={{
                    width: dotSize,
                    height: dotSize,
                    borderRadius: dotSize / 2,
                    backgroundColor: o.color,
                    opacity: value == null || active ? 1 : 0.45,
                    borderWidth: active ? 2 : 0,
                    borderColor: theme.colors.text,
                  }}
                />
              </View>
            </PressableScale>
          );
        })}
      </View>
      {large ? (
        <Text variant="title2" align="center" color="text" style={styles.largeLabel}>
          {value == null ? 'Como você está?' : options[value].label}
        </Text>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  panel: { padding: 14 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dotWrap: { alignItems: 'center', justifyContent: 'center' },
  largeLabel: { marginTop: 10 },
});
