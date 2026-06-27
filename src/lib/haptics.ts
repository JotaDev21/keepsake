import * as Haptics from 'expo-haptics';

/**
 * Haptics are part of the emotional grammar — a quiet physical "yes" at the
 * right moment. Everything is fire-and-forget and swallows errors (some
 * devices/emulators have no haptic engine; a missing buzz must never crash).
 */
const run = (p: Promise<unknown>): void => {
  p.catch(() => {});
};

export const haptics = {
  /** A light tap — press states, selections. */
  tap: () => run(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  /** A soft, rounded tap — gentle moments (mood pick). */
  soft: () => run(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft)),
  /** A firmer tap — committing something. */
  medium: () => run(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)),
  /** A weighty thud — opening a capsule, a real moment. */
  heavy: () => run(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)),
  /** Discrete selection ticks — moving between tabs/options. */
  selection: () => run(Haptics.selectionAsync()),
  /** Saved / done. */
  success: () => run(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  warning: () => run(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)),
  error: () => run(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)),
} as const;
