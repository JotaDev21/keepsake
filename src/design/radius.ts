/** Corner radii. Soft, never sharp — nothing in this app should feel hard. */
export const radius = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 22,
  xl: 30,
  pill: 999,
} as const;

export type RadiusToken = keyof typeof radius;
