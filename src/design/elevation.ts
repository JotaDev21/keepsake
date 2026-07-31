import type { ViewStyle } from 'react-native';

/**
 * Elevation = soft warm shadow + blur. Never heavy, never hard-edged.
 * Shadows use a near-black warm tone and large, low-opacity blur so surfaces
 * feel like they're floating in dim light.
 */
export const elevation = {
  none: {} as ViewStyle,
  low: {
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.24)',
  } as ViewStyle,
  medium: {
    boxShadow: '0 14px 38px rgba(0, 0, 0, 0.32)',
  } as ViewStyle,
  high: {
    boxShadow: '0 22px 60px rgba(0, 0, 0, 0.42)',
  } as ViewStyle,
} as const;

export type ElevationToken = keyof typeof elevation;

/** Blur intensities for glass surfaces (expo-blur `intensity`). */
export const blur = {
  subtle: 18,
  medium: 40,
  strong: 70,
} as const;

export type BlurToken = keyof typeof blur;
