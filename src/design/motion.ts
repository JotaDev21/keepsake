import type { WithSpringConfig } from 'react-native-reanimated';

/**
 * Motion language. Everything moves with spring physics — never raw linear or
 * ease. The defaults lean calm and slightly slow: this app is in no hurry.
 * A little overshoot is reserved for delight (press, capsule), not for content.
 */
export const springs = {
  /** Content settling — barely any overshoot. The everyday spring. */
  gentle: { damping: 22, stiffness: 130, mass: 1 },
  /** Slow, emotional reveals — the "take your time" spring. */
  soft: { damping: 26, stiffness: 80, mass: 1.1 },
  /** Press feedback — quick and tiny. */
  press: { damping: 18, stiffness: 320, mass: 0.7 },
  /** Reserved delight — a gentle, intentional bounce. */
  bounce: { damping: 13, stiffness: 180, mass: 0.9 },
  /** Large surfaces gliding (hero, sheets). */
  glide: { damping: 24, stiffness: 110, mass: 1 },
} satisfies Record<string, WithSpringConfig>;

export type SpringToken = keyof typeof springs;

/** Durations for the rare timing-based animation (shimmer, fades, rituals). */
export const durations = {
  fast: 180,
  base: 300,
  slow: 520,
  /** A capsule opening, a letter revealing — treat as a ritual. */
  ritual: 1200,
} as const;

/** Default stagger step between items revealing in a list (ms). */
export const STAGGER_STEP = 55;
