import { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  interpolate,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { radius, spacing, springs, useTheme, withAlpha } from '@/design';
import { haptics } from '@/lib/haptics';

import { PressableScale } from './PressableScale';
import { SunflowerMark } from './SunflowerMark';
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
  /** Full emotional ritual used on the journal screen. */
  large?: boolean;
}

const MOOD_COPY: Record<string, string> = {
  pesado: 'O dia está pedindo colo e menos peso.',
  quieto: 'Há coisas aqui dentro que ainda não querem nome.',
  sereno: 'O coração encontrou um lugar macio para pousar.',
  leve: 'Tem espaço para respirar e deixar a luz entrar.',
  radiante: 'A alegria está transbordando pelas bordas.',
};

const optionCopy = (label: string) =>
  MOOD_COPY[label.toLocaleLowerCase('pt-BR')] ?? 'Este é o clima mais perto do que você sente.';

/**
 * Emotional weather, not a five-dot rating. Each state is a small celestial
 * body on a horizon; selection lifts it, opens its rays and changes the whole
 * atmosphere. Color morphing and movement stay on the UI thread.
 */
export function MoodSelector({ options, value, onChange, large = false }: MoodSelectorProps) {
  const theme = useTheme();
  const selectedIndex = value ?? 0;
  const selectedColor = value == null ? theme.colors.accentBloom : options[selectedIndex].color;
  const sel = useSharedValue(selectedIndex);
  const colored = useSharedValue(value == null ? 0 : 1);
  const wasNull = useRef(value == null);

  useEffect(() => {
    if (value == null) {
      colored.value = withSpring(0, springs.gentle);
      wasNull.current = true;
      return;
    }
    if (wasNull.current) {
      sel.value = value;
      colored.value = withSpring(1, springs.gentle);
      wasNull.current = false;
    } else {
      sel.value = withSpring(value, springs.gentle);
    }
  }, [colored, sel, value]);

  const inputRange = options.map((_, index) => index);
  const atmosphericColors = options.map((option) =>
    withAlpha(option.color, theme.dark ? 0.2 : 0.28),
  );

  const panelStyle = useAnimatedStyle(() => {
    const moodColor = interpolateColor(sel.value, inputRange, atmosphericColors);
    return {
      backgroundColor: interpolateColor(
        colored.value,
        [0, 1],
        [theme.colors.surface, moodColor],
      ),
    };
  });

  return (
    <Animated.View
      style={[
        styles.panel,
        large ? styles.panelLarge : styles.panelCompact,
        {
          borderColor: value == null ? theme.colors.borderStrong : withAlpha(selectedColor, 0.48),
          boxShadow:
            value == null
              ? '0 14px 38px rgba(0, 0, 0, 0.24)'
              : `0 18px 46px ${withAlpha(selectedColor, theme.dark ? 0.18 : 0.14)}`,
        },
        panelStyle,
      ]}
    >
      <View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          {
            experimental_backgroundImage: [
              `radial-gradient(circle at 50% 6%, ${withAlpha(selectedColor, value == null ? 0.08 : 0.28)} 0%, transparent 46%)`,
              `linear-gradient(165deg, ${theme.colors.surfaceHighlight} 0%, transparent 34%, ${withAlpha(theme.colors.backgroundDeep, 0.34)} 100%)`,
            ].join(','),
          },
        ]}
      />
      <View
        pointerEvents="none"
        style={[styles.horizon, { borderColor: withAlpha(selectedColor, value == null ? 0.12 : 0.32) }]}
      />

      {large ? (
        <LargeReading option={value == null ? null : options[selectedIndex]} index={selectedIndex} />
      ) : (
        <CompactReading option={value == null ? null : options[selectedIndex]} index={selectedIndex} />
      )}

      <View style={[styles.options, large ? styles.optionsLarge : null]}>
        {options.map((option, index) => (
          <MoodChoice
            key={option.label}
            option={option}
            index={index}
            active={value === index}
            dimmed={value != null && value !== index}
            large={large}
            onPress={() => {
              onChange(index);
              haptics.soft();
            }}
          />
        ))}
      </View>
    </Animated.View>
  );
}

function CompactReading({ option, index }: { option: MoodOption | null; index: number }) {
  return (
    <View style={styles.compactReading}>
      <View style={styles.compactCopy}>
        <Text variant="overline" color="textMuted">
          clima interior
        </Text>
        <Text variant="title1" color="text" style={styles.readingTitle}>
          {option?.label ?? 'Escute por um instante.'}
        </Text>
        <Text variant="caption" color="textSecondary" numberOfLines={2} style={styles.readingCopy}>
          {option ? optionCopy(option.label) : 'Toque no estado que chega mais perto — sem precisar explicar.'}
        </Text>
      </View>
      <View style={styles.compactGlyph}>
        {option ? (
          <MoodGlyph color={option.color} index={index} size={52} active />
        ) : (
          <SunflowerMark size={42} />
        )}
      </View>
    </View>
  );
}

function LargeReading({ option, index }: { option: MoodOption | null; index: number }) {
  const theme = useTheme();
  const color = option?.color ?? theme.colors.accentBloom;

  return (
    <View style={styles.largeReading}>
      <Text variant="overline" color="textMuted">
        seu clima interior
      </Text>
      <View
        style={[
          styles.aura,
          {
            borderColor: withAlpha(color, option ? 0.48 : 0.2),
            backgroundColor: withAlpha(color, option ? 0.12 : 0.05),
            boxShadow: `0 18px 52px ${withAlpha(color, option ? 0.24 : 0.08)}`,
          },
        ]}
      >
        <View style={[styles.auraRingOuter, { borderColor: withAlpha(color, 0.18) }]} />
        <View style={[styles.auraRingInner, { borderColor: withAlpha(color, 0.32) }]} />
        {option ? <MoodGlyph color={color} index={index} size={74} active /> : <SunflowerMark size={50} />}
      </View>
      <Text variant="display" color="text" align="center" style={styles.largeTitle}>
        {option?.label ?? 'Como isso vive em você?'}
      </Text>
      <Text variant="serif" color="textSecondary" align="center" style={styles.largeCopy}>
        {option ? optionCopy(option.label) : 'Não procure a palavra perfeita. Escolha a sensação mais próxima.'}
      </Text>
    </View>
  );
}

function MoodChoice({
  option,
  index,
  active,
  dimmed,
  large,
  onPress,
}: {
  option: MoodOption;
  index: number;
  active: boolean;
  dimmed: boolean;
  large: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  const progress = useSharedValue(active ? 1 : 0);

  useEffect(() => {
    progress.value = withSpring(active ? 1 : 0, springs.press);
  }, [active, progress]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: dimmed ? 0.72 + progress.value * 0.28 : 1,
    transform: [
      { translateY: interpolate(progress.value, [0, 1], [0, large ? -8 : -5]) },
      { scale: interpolate(progress.value, [0, 1], [0.94, 1.08]) },
    ],
  }));

  return (
    <PressableScale
      onPress={onPress}
      haptic={false}
      scaleTo={0.9}
      accessibilityLabel={option.label}
      style={styles.optionHit}
    >
      <Animated.View style={[styles.optionBody, animatedStyle]}>
        <View
          style={[
            styles.optionOrb,
            {
              width: large ? 44 : 38,
              height: large ? 44 : 38,
              borderColor: active ? withAlpha(option.color, 0.82) : theme.colors.borderStrong,
              backgroundColor: active ? withAlpha(option.color, 0.16) : theme.colors.surface,
              boxShadow: active ? `0 8px 20px ${withAlpha(option.color, 0.28)}` : undefined,
            },
          ]}
        >
          <MoodGlyph color={option.color} index={index} size={large ? 28 : 24} active={active} />
        </View>
        <Text
          variant="caption"
          numberOfLines={1}
          style={[
            styles.optionLabel,
            { color: active ? theme.colors.text : theme.colors.textMuted },
          ]}
        >
          {option.label}
        </Text>
      </Animated.View>
    </PressableScale>
  );
}

function MoodGlyph({
  color,
  index,
  size,
  active,
}: {
  color: string;
  index: number;
  size: number;
  active: boolean;
}) {
  const rayCount = 3 + index;
  const core = size * (0.24 + index * 0.018);

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {Array.from({ length: rayCount }, (_, ray) => (
        <View
          key={ray}
          style={{
            position: 'absolute',
            width: active ? 1.5 : 1,
            height: size * 0.2,
            borderRadius: radius.pill,
            backgroundColor: color,
            opacity: active ? 0.92 : 0.5,
            transform: [
              { rotate: `${(360 / rayCount) * ray}deg` },
              { translateY: -size * 0.32 },
            ],
          }}
        />
      ))}
      <View
        style={{
          width: core,
          height: core,
          borderRadius: radius.pill,
          backgroundColor: color,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: withAlpha(color, 0.9),
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    overflow: 'hidden',
    borderRadius: radius.xl,
    borderCurve: 'continuous',
    borderWidth: StyleSheet.hairlineWidth,
  },
  panelCompact: { padding: spacing.lg, minHeight: 190 },
  panelLarge: { padding: spacing.xl, minHeight: 448 },
  horizon: {
    position: 'absolute',
    width: '128%',
    height: 160,
    left: '-14%',
    bottom: -112,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  compactReading: {
    minHeight: 92,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  compactCopy: { flex: 1 },
  compactGlyph: { width: 58, alignItems: 'center', justifyContent: 'center' },
  readingTitle: { marginTop: spacing.xs },
  readingCopy: { marginTop: spacing.xs },
  largeReading: { alignItems: 'center' },
  aura: {
    width: 136,
    height: 136,
    marginTop: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
  auraRingOuter: {
    position: 'absolute',
    width: 174,
    height: 174,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
  auraRingInner: {
    position: 'absolute',
    width: 104,
    height: 104,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
  largeTitle: { marginTop: spacing.xl },
  largeCopy: { marginTop: spacing.xs, maxWidth: 300 },
  options: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: spacing.xs,
    marginTop: spacing.lg,
  },
  optionsLarge: { marginTop: spacing.xxl },
  optionHit: { flex: 1 },
  optionBody: { alignItems: 'center', gap: spacing.xs },
  optionOrb: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
  optionLabel: { fontSize: 10, lineHeight: 13 },
});
