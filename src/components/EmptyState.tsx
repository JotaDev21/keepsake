import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import Animated from 'react-native-reanimated';

import { fadeIn } from '@/animations';
import { spacing, useTheme } from '@/design';

import { Button } from './Button';
import type { IconName } from './Icon';
import { SunflowerMark } from './SunflowerMark';
import { Text } from './Text';

interface EmptyStateProps {
  /** Kept for compatibility — the sunflower mark is the visual signature now. */
  icon?: IconName;
  /** The emotional line (rendered in serif). */
  title: string;
  /** A gentle, smaller invitation. */
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
  style?: StyleProp<ViewStyle>;
}

/**
 * Empty states with soul: the quiet sunflower signature, a serif line, and a
 * delicate invite — never a dry "no items".
 */
export function EmptyState({ title, message, actionLabel, onAction, style }: EmptyStateProps) {
  const theme = useTheme();

  return (
    <Animated.View entering={fadeIn(120)} style={[styles.container, style]}>
      <SunflowerMark size={34} style={{ marginBottom: theme.spacing.lg }} />
      <Text variant="title2" align="center">
        {title}
      </Text>
      {message ? (
        <Text
          variant="serif"
          color="textSecondary"
          align="center"
          style={{ marginTop: theme.spacing.sm, maxWidth: 300 }}
        >
          {message}
        </Text>
      ) : null}
      {actionLabel && onAction ? (
        <Button
          label={actionLabel}
          variant="ghost"
          onPress={onAction}
          style={{ marginTop: theme.spacing.xl }}
        />
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xl },
});
