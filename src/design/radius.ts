/** Corner radii. Soft and generous — nothing in this app should feel hard. */
export const radius = {
  xs: 10,
  sm: 14,
  md: 18,
  lg: 24,
  xl: 32,
  pill: 999,
} as const;

export type RadiusToken = keyof typeof radius;
