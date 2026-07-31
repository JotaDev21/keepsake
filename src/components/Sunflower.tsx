import { useEffect, useMemo, useState } from 'react';
import { AppState, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { springs, useTheme, withAlpha } from '@/design';
import { haptics } from '@/lib/haptics';

import { PressableScale } from './PressableScale';

interface SunflowerProps {
  size?: number;
  /** 0..1 bloom / growth — 0 = a folded seed, 1 = a full flower. */
  stage?: number;
  /** Gentle idle sway, like a breeze. */
  sway?: boolean;
  /** Tap → a joyful spin + pop + soft haptic, then onPress. */
  onPress?: () => void;
  /** Petals per ring (two rings are drawn). */
  petals?: number;
  style?: StyleProp<ViewStyle>;
}

interface Petal {
  angle: number;
  length: number;
  width: number;
  baseRadius: number;
  color: string;
  tip: string;
}

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

/**
 * A living sunflower, drawn entirely from Views (no SVG dependency) and moved
 * on the UI thread. Two rings of petals around a seeded brown center; it blooms
 * with `stage`, sways in an idle breeze, and spins joyfully on tap. The app's
 * signature — used in the garden, on Hoje, and as a mark of showing up.
 */
export function Sunflower({
  size = 176,
  stage = 1,
  sway = true,
  onPress,
  petals = 13,
  style,
}: SunflowerProps) {
  const theme = useTheme();
  // A sunflower remains a sunflower. Personal accents tint the interface,
  // never the petals.
  const petal = theme.colors.sunflowerPetal;
  const petalDeep = theme.colors.sunflowerPetalDeep;
  const petalLight = theme.colors.sunflowerPetalLight;

  const bloom = useSharedValue(clamp01(stage));
  const swayV = useSharedValue(0);
  const spin = useSharedValue(0);
  const pop = useSharedValue(1);

  // The breeze rests while the app is in the background — no work off-screen.
  const [appActive, setAppActive] = useState(
    () => (AppState.currentState ?? 'active') === 'active',
  );

  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => setAppActive(next === 'active'));
    return () => sub.remove();
  }, []);

  useEffect(() => {
    bloom.value = withSpring(clamp01(stage), springs.soft);
  }, [stage, bloom]);

  useEffect(() => {
    if (sway && appActive) {
      // Drift back to the resting lean first, so a resume never snaps mid-sway.
      swayV.value = withSequence(
        withTiming(0, { duration: 350, easing: Easing.inOut(Easing.sin) }),
        withRepeat(withTiming(1, { duration: 3200, easing: Easing.inOut(Easing.sin) }), -1, true),
      );
    } else {
      cancelAnimation(swayV);
      swayV.value = withTiming(0, { duration: 300 });
    }
    return () => cancelAnimation(swayV);
  }, [sway, appActive, swayV]);

  const { back, front, seed } = useMemo(() => {
    const seedR = size * 0.17;
    const buildRing = (count: number, offset: number, len: number, w: number, color: string, tip: string): Petal[] =>
      Array.from({ length: count }, (_, i) => ({
        angle: (360 / count) * i + offset,
        length: len,
        width: w,
        baseRadius: seedR * 0.82,
        color,
        tip,
      }));
    return {
      back: buildRing(petals, 360 / petals / 2, size * 0.36, size * 0.115, petalDeep, petal),
      front: buildRing(petals, 0, size * 0.32, size * 0.13, petal, petalLight),
      seed: seedR,
    };
  }, [petal, petalDeep, petalLight, petals, size]);

  const headStyle = useAnimatedStyle(() => ({
    transform: [
      { rotate: `${(swayV.value * 2 - 1) * 3.5 + spin.value}deg` },
      { scale: (0.34 + bloom.value * 0.66) * pop.value },
    ],
  }));

  const handlePress = () => {
    haptics.soft();
    pop.value = withSequence(withSpring(1.12, springs.bounce), withSpring(1, springs.gentle));
    spin.value = withTiming(spin.value + 360, { duration: 950, easing: Easing.out(Easing.cubic) });
    onPress?.();
  };

  const flower = (
    <View style={[{ width: size, height: size }, styles.center]}>
      {/* Soft glow halo behind the head. */}
      <View
        style={[
          styles.glow,
          {
            width: size * 0.94,
            height: size * 0.94,
            borderRadius: size,
            backgroundColor: withAlpha(theme.colors.sunflowerPetal, 0.14),
          },
        ]}
      />
      <Animated.View style={[{ width: size, height: size }, styles.center, headStyle]}>
        {back.map((p, i) => (
          <PetalView key={`b${i}`} petal={p} size={size} />
        ))}
        {front.map((p, i) => (
          <PetalView key={`f${i}`} petal={p} size={size} />
        ))}
        {/* Seeded center — a brown disc textured with rings of tiny seeds. */}
        <View
          style={[
            styles.seed,
            { width: seed * 2, height: seed * 2, borderRadius: seed, backgroundColor: theme.colors.seed },
          ]}
        >
          <SeedDots radius={seed} color={theme.colors.seedShadow} />
          <View
            style={{ width: seed * 0.5, height: seed * 0.5, borderRadius: seed, backgroundColor: theme.colors.seedDeep }}
          />
        </View>
      </Animated.View>
    </View>
  );

  if (!onPress) return <View style={style}>{flower}</View>;

  return (
    <PressableScale onPress={handlePress} haptic={false} scaleTo={0.94} accessibilityLabel="Girassol" style={style}>
      {flower}
    </PressableScale>
  );
}

/** One petal, placed radially by rotating a full-size layer around the center. */
function PetalView({ petal, size }: { petal: Petal; size: number }) {
  const { angle, length, width, baseRadius, color, tip } = petal;
  const marginTop = size / 2 - baseRadius - length;
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.petalLayer, { transform: [{ rotate: `${angle}deg` }] }]}>
      <View
        style={{
          marginTop,
          width,
          height: length,
          borderRadius: width,
          backgroundColor: color,
        }}
      >
        {/* A lighter tip gives each petal a hint of dimension. */}
        <View
          style={{
            height: length * 0.42,
            borderTopLeftRadius: width,
            borderTopRightRadius: width,
            backgroundColor: tip,
          }}
        />
      </View>
    </View>
  );
}

/** A ring of tiny seeds for the center's texture. */
function SeedDots({ radius, color }: { radius: number; color: string }) {
  const dots = useMemo(() => {
    const out: { x: number; y: number; s: number }[] = [];
    const rings = [
      { r: radius * 0.55, count: 10, s: radius * 0.16 },
      { r: radius * 0.28, count: 6, s: radius * 0.14 },
    ];
    for (const ring of rings) {
      for (let i = 0; i < ring.count; i++) {
        const a = (Math.PI * 2 * i) / ring.count + (ring.count === 6 ? 0.5 : 0);
        out.push({ x: Math.cos(a) * ring.r, y: Math.sin(a) * ring.r, s: ring.s });
      }
    }
    return out;
  }, [radius]);

  return (
    <View style={[StyleSheet.absoluteFill, styles.center]} pointerEvents="none">
      {dots.map((d, i) => (
        <View
          key={i}
          style={{
            position: 'absolute',
            width: d.s,
            height: d.s,
            borderRadius: d.s,
            backgroundColor: color,
            transform: [{ translateX: d.x }, { translateY: d.y }],
          }}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  glow: { position: 'absolute' },
  petalLayer: { alignItems: 'center', justifyContent: 'flex-start' },
  seed: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
});
