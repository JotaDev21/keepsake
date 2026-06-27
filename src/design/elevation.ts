import type { ViewStyle } from 'react-native';

/**
 * Elevation = soft warm shadow + blur. Never heavy, never hard-edged.
 * Shadows use a near-black warm tone and large, low-opacity blur so surfaces
 * feel like they're floating in dim light.
 */
export const elevation = {
  none: {} as ViewStyle,
  low: {
    shadowColor: '#000000',
    shadowOpacity: 0.22,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  } as ViewStyle,
  medium: {
    shadowColor: '#000000',
    shadowOpacity: 0.3,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 12,
  } as ViewStyle,
  high: {
    shadowColor: '#000000',
    shadowOpacity: 0.4,
    shadowRadius: 40,
    shadowOffset: { width: 0, height: 20 },
    elevation: 22,
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
