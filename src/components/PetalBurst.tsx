import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { lighten, useTheme } from '@/design';

interface PetalBurstProps {
  /** Increment this number to fire a burst. */
  trigger: number;
  count?: number;
  /** Spread radius in px. */
  radius?: number;
  color?: string;
}

/** How long one burst lives on screen. */
const BURST_MS = 1100;
/** A small grace so the last petals finish fading before they unmount. */
const SETTLE_MS = 80;

/**
 * A soft shower of petals bursting from the center — a wordless "yes" for
 * moments of tenderness (a thought sent, the garden watered). Fire-and-forget:
 * bump `trigger` and petals fling outward and fade on the UI thread. The
 * petal views exist only while a burst is alive — nothing stays mounted
 * between celebrations.
 */
export function PetalBurst({ trigger, count = 14, radius = 150, color }: PetalBurstProps) {
  const theme = useTheme();
  const tint = color ?? theme.colors.accentBloom;
  const [bursting, setBursting] = useState(false);

  useEffect(() => {
    if (trigger <= 0) return;
    setBursting(true);
    const timer = setTimeout(() => setBursting(false), BURST_MS + SETTLE_MS);
    return () => clearTimeout(timer);
  }, [trigger]);

  const petals = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => {
        const angle = (Math.PI * 2 * i) / count + (i % 2 ? 0.22 : -0.15);
        const dist = radius * (0.6 + ((i * 37) % 40) / 100);
        return {
          dx: Math.cos(angle) * dist,
          dy: Math.sin(angle) * dist,
          rot: (i % 2 ? 1 : -1) * (90 + (i * 53) % 160),
          w: 8 + (i % 3) * 3,
          h: 16 + (i % 4) * 4,
          c: i % 3 === 0 ? lighten(tint, 0.2) : tint,
        };
      }),
    [count, radius, tint],
  );

  if (!bursting) return null;

  return (
    <View pointerEvents="none" style={styles.wrap}>
      {petals.map((p, i) => (
        <BurstPetal key={i} petal={p} trigger={trigger} />
      ))}
    </View>
  );
}

function BurstPetal({
  petal,
  trigger,
}: {
  petal: { dx: number; dy: number; rot: number; w: number; h: number; c: string };
  trigger: number;
}) {
  const progress = useSharedValue(0);

  // Mounted only while bursting — fly on mount, restart on a re-trigger.
  useEffect(() => {
    progress.value = 0;
    progress.value = withTiming(1, { duration: BURST_MS, easing: Easing.out(Easing.cubic) });
    return () => cancelAnimation(progress);
  }, [trigger, progress]);

  const style = useAnimatedStyle(() => {
    const p = progress.value;
    return {
      opacity: interpolate(p, [0, 0.15, 0.75, 1], [0, 1, 0.9, 0]),
      transform: [
        { translateX: petal.dx * p },
        { translateY: petal.dy * p - interpolate(p, [0, 1], [0, 18]) },
        { rotate: `${petal.rot * p}deg` },
        { scale: interpolate(p, [0, 0.25, 1], [0.3, 1, 0.7]) },
      ],
    };
  });

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          width: petal.w,
          height: petal.h,
          borderRadius: petal.w,
          backgroundColor: petal.c,
        },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
});
