import { FadeIn, FadeInDown } from 'react-native-reanimated';

import { durations, STAGGER_STEP } from '@/design';

/**
 * Reusable entrance presets. The rule: things arrive softly, in cascade —
 * never all at once, never with a hard linear cut.
 */

/**
 * The everyday list entrance: fade + rise, settling with a spring. Pass the
 * item index so a list reveals in a gentle stagger.
 */
export const enterRise = (index = 0) =>
  FadeInDown.springify().damping(20).stiffness(120).mass(1).delay(index * STAGGER_STEP);

/** Simple fade in, optionally delayed (ms). */
export const fadeIn = (delayMs = 0) => FadeIn.duration(durations.base).delay(delayMs);
