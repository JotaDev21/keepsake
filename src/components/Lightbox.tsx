import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Dimensions, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { Image } from 'expo-image';

import { radius as radiusTokens, springs, useTheme } from '@/design';
import { haptics } from '@/lib/haptics';

/**
 * Hero lightbox. A grid thumbnail grows *continuously* into a fullscreen view
 * — same pixels, no cut — and is dismissed by dragging it away. The whole
 * motion runs on the UI thread via a single `progress` shared value that
 * interpolates the image's frame between its source rect and a centered target.
 */

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
  radius: number;
}

interface OpenInput {
  uri: string;
  sourceRect: Rect;
}

interface ActiveItem extends OpenInput {
  key: number;
  targetRect: Rect;
}

interface LightboxContextValue {
  open: (input: OpenInput) => void;
}

const LightboxContext = createContext<LightboxContextValue>({ open: () => {} });

export function useLightbox(): LightboxContextValue {
  return useContext(LightboxContext);
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function LightboxProvider({ children }: { children: ReactNode }) {
  const [active, setActive] = useState<ActiveItem | null>(null);
  const keyRef = useRef(0);

  const progress = useSharedValue(0);
  const dragX = useSharedValue(0);
  const dragY = useSharedValue(0);

  const clear = useCallback(() => setActive(null), []);

  const close = useCallback(() => {
    dragX.value = withSpring(0, springs.glide);
    dragY.value = withSpring(0, springs.glide);
    progress.value = withSpring(0, springs.glide, (finished) => {
      'worklet';
      if (finished) runOnJS(clear)();
    });
  }, [clear, dragX, dragY, progress]);

  const open = useCallback(
    (input: OpenInput) => {
      const win = Dimensions.get('window');
      const aspect = input.sourceRect.height / input.sourceRect.width;
      const targetWidth = win.width;
      const targetHeight = targetWidth * aspect;
      const targetRect: Rect = {
        x: 0,
        y: (win.height - targetHeight) / 2,
        width: targetWidth,
        height: targetHeight,
        radius: 0,
      };
      keyRef.current += 1;
      dragX.value = 0;
      dragY.value = 0;
      progress.value = 0;
      setActive({ ...input, targetRect, key: keyRef.current });
      progress.value = withSpring(1, springs.glide);
      haptics.soft();
    },
    [dragX, dragY, progress],
  );

  const value = useMemo<LightboxContextValue>(() => ({ open }), [open]);

  return (
    <LightboxContext.Provider value={value}>
      <View style={styles.root}>
        {children}
        {active ? (
          <Overlay
            item={active}
            progress={progress}
            dragX={dragX}
            dragY={dragY}
            onClose={close}
          />
        ) : null}
      </View>
    </LightboxContext.Provider>
  );
}

interface OverlayProps {
  item: ActiveItem;
  progress: ReturnType<typeof useSharedValue<number>>;
  dragX: ReturnType<typeof useSharedValue<number>>;
  dragY: ReturnType<typeof useSharedValue<number>>;
  onClose: () => void;
}

function Overlay({ item, progress, dragX, dragY, onClose }: OverlayProps) {
  const theme = useTheme();
  const src = item.sourceRect;
  const tgt = item.targetRect;

  const pan = useMemo(
    () =>
      Gesture.Pan()
        .onUpdate((e) => {
          dragX.value = e.translationX;
          dragY.value = e.translationY;
        })
        .onEnd((e) => {
          const dismiss = Math.abs(e.translationY) > 120 || Math.abs(e.velocityY) > 900;
          if (dismiss) {
            runOnJS(onClose)();
          } else {
            dragX.value = withSpring(0, springs.gentle);
            dragY.value = withSpring(0, springs.gentle);
          }
        }),
    [dragX, dragY, onClose],
  );

  const frameStyle = useAnimatedStyle(() => {
    const p = progress.value;
    const dragMag = Math.min(1, Math.abs(dragY.value) / 320);
    const dragScale = 1 - dragMag * 0.14;
    return {
      left: interpolate(p, [0, 1], [src.x, tgt.x]),
      top: interpolate(p, [0, 1], [src.y, tgt.y]),
      width: interpolate(p, [0, 1], [src.width, tgt.width]),
      height: interpolate(p, [0, 1], [src.height, tgt.height]),
      borderRadius: interpolate(p, [0, 1], [src.radius, tgt.radius]),
      transform: [
        { translateX: dragX.value },
        { translateY: dragY.value },
        { scale: dragScale },
      ],
    };
  });

  const scrimStyle = useAnimatedStyle(() => {
    const dragMag = Math.min(1, Math.abs(dragY.value) / 320);
    return { opacity: progress.value * (1 - dragMag * 0.7) };
  });

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <AnimatedPressable
        style={[StyleSheet.absoluteFill, { backgroundColor: theme.colors.scrim }, scrimStyle]}
        onPress={onClose}
      />
      <GestureDetector gesture={pan}>
        <Animated.View
          style={[styles.frame, { backgroundColor: theme.colors.backgroundDeep }, frameStyle]}
        >
          <Image
            source={item.uri}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            transition={0}
          />
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

interface LightboxImageProps {
  uri: string;
  style?: StyleProp<ViewStyle>;
  radius?: number;
}

/**
 * A measurable thumbnail that opens into the lightbox on tap. It captures its
 * on-screen rect so the hero can grow from exactly where it sits.
 */
export function LightboxImage({ uri, style, radius = radiusTokens.lg }: LightboxImageProps) {
  const ref = useRef<View>(null);
  const { open } = useLightbox();

  const onPress = useCallback(() => {
    ref.current?.measureInWindow((x, y, width, height) => {
      if (!width || !height) return;
      open({ uri, sourceRect: { x, y, width, height, radius } });
    });
  }, [open, uri, radius]);

  return (
    <View ref={ref} style={style} collapsable={false}>
      <Pressable onPress={onPress} style={StyleSheet.absoluteFill}>
        <Image
          source={uri}
          style={[StyleSheet.absoluteFill, { borderRadius: radius }]}
          contentFit="cover"
          transition={200}
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  frame: {
    position: 'absolute',
    overflow: 'hidden',
  },
});
