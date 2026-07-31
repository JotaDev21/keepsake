import { useSafeAreaInsets } from 'react-native-safe-area-context';

/** Geometry of the floating dock, shared by the bar and screens. */
export const TAB_BAR_CONTENT_HEIGHT = 64;

/** Vertical space a screen should leave so content clears the grounded bar. */
export function useTabBarSpace(): number {
  const insets = useSafeAreaInsets();
  return TAB_BAR_CONTENT_HEIGHT + Math.max(insets.bottom, 8) + 24;
}
