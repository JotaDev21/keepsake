import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated from 'react-native-reanimated';

import { fadeIn } from '@/animations';
import { useTheme } from '@/design';

import { Button } from './Button';
import { Icon, type IconName } from './Icon';
import { Text } from './Text';

interface EmptyStateProps {
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
 * Empty states with soul: a quiet icon, a serif line, and a delicate invite —
 * never a dry "no items".
 */
export function EmptyState({ icon, title, message, actionLabel, onAction, style }: EmptyStateProps) {
  const theme = useTheme();

  return (
    <Animated.View entering={fadeIn(120)} style={[styles.container, style]}>
      {icon ? (
        <View style={[styles.iconWrap, { backgroundColor: theme.colors.accentSoft }]}>
          <Icon name={icon} size={26} color="accent" />
        </View>
      ) : null}
      <Text variant="quote" color="textSecondary" align="center">
        {title}
      </Text>
      {message ? (
        <Text
          variant="body"
          color="textMuted"
          align="center"
          style={{ marginTop: theme.spacing.sm, maxWidth: 300 }}
        >
          {message}
        </Text>
      ) : null}
      {actionLabel && onAction ? (
        <Button
          label={actionLabel}
          variant="secondary"
          onPress={onAction}
          style={{ marginTop: theme.spacing.xl }}
        />
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
});
