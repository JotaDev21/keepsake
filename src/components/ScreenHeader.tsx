import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { spacing, useTheme } from '@/design';

import { SunflowerMark } from './SunflowerMark';
import { Text } from './Text';

interface ScreenHeaderProps {
  /** Small golden kicker above the title. */
  overline?: string;
  title: string;
  /** A warm serif line under the title. */
  subtitle?: string;
  /** Show the sunflower signature beside the overline (default on). */
  mark?: boolean;
  /** Title register: 'title1' everywhere; 'hero' for grand openings (onboarding). */
  size?: 'title1' | 'hero';
  style?: StyleProp<ViewStyle>;
}

/**
 * The standard screen opening — one voice across the whole app:
 * sunflower mark + golden overline, close serif title, warm subtitle.
 */
export function ScreenHeader({ overline, title, subtitle, mark = true, size = 'title1', style }: ScreenHeaderProps) {
  const theme = useTheme();
  const hasKicker = Boolean(overline) || mark;
  return (
    <View style={[styles.root, style]}>
      <View style={[styles.rail, { backgroundColor: theme.colors.accent }]} />
      <View style={styles.copy}>
        {hasKicker ? (
          <View style={styles.kicker}>
            {mark ? <SunflowerMark size={size === 'hero' ? 18 : 13} /> : null}
            {overline ? (
              <Text variant="overline" color="accent">
                {overline}
              </Text>
            ) : null}
          </View>
        ) : null}
        <Text variant={size === 'hero' ? 'hero' : 'display'} color="text" style={hasKicker ? styles.titleAfterKicker : undefined}>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="serif" color="textSecondary" style={styles.subtitle}>
            {subtitle}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flexDirection: 'row', gap: spacing.md },
  rail: {
    width: 2,
    minHeight: 54,
    borderRadius: 999,
    opacity: 0.82,
  },
  copy: { flex: 1 },
  kicker: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  titleAfterKicker: { marginTop: spacing.sm },
  subtitle: { marginTop: spacing.xs, maxWidth: 340 },
});
