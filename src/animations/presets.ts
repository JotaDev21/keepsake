import { FadeIn, FadeInDown } from 'react-native-reanimated';

import { durations, STAGGER_STEP } from '@/design';

/**
 * Reusable entrance presets. The rule: things arrive softly, in cascade —
 * never all at once, never with a hard linear cut.
 */

/** Past this index the stagger stops growing — deep items shouldn't wait seconds. */
const STAGGER_CAP = 8;

/**
 * The everyday list entrance: fade + rise, settling with a spring. Pass the
 * item index so a list reveals in a gentle stagger. The delay is capped so
 * long lists still feel cascading without keeping late items invisible.
 */
export const enterRise = (index = 0) =>
  FadeInDown.springify()
    .damping(20)
    .stiffness(120)
    .mass(1)
    .delay(Math.min(index, STAGGER_CAP) * STAGGER_STEP);

/** Simple fade in, optionally delayed (ms). */
export const fadeIn = (delayMs = 0) => FadeIn.duration(durations.base).delay(delayMs);
