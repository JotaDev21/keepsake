import { useSafeAreaInsets } from 'react-native-safe-area-context';

/** Geometry of the floating glass tab bar, shared by the bar and screens. */
export const TAB_BAR_PILL_HEIGHT = 62;
export const TAB_BAR_BOTTOM_GAP = 14;
export const TAB_BAR_SIDE_MARGIN = 16;

/** Vertical space a screen should leave so content clears the floating bar. */
export function useTabBarSpace(): number {
  const insets = useSafeAreaInsets();
  return TAB_BAR_PILL_HEIGHT + TAB_BAR_BOTTOM_GAP + Math.max(insets.bottom, 8);
}
