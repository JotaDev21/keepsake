import { StyleSheet, View } from 'react-native';

import { Icon, PressableScale, Text, type IconName } from '@/components';
import { radius, spacing, useTheme } from '@/design';

interface HomeShortcutProps {
  icon: IconName;
  label: string;
  hint: string;
  onPress: () => void;
}

export function HomeShortcut({ icon, label, hint, onPress }: HomeShortcutProps) {
  const theme = useTheme();
  return (
    <PressableScale onPress={onPress} accessibilityLabel={`${label} ${hint}`}
      style={[styles.shortcut, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
      <View style={styles.icon}><Icon name={icon} size={spacing.xl} color="accent" /></View>
      <Text variant="subhead">{label}</Text>
      <Text variant="caption" color="textMuted" align="center">{hint}</Text>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  shortcut: { flex: 1, alignItems: 'center', paddingVertical: spacing.lg, paddingHorizontal: spacing.xs, borderRadius: radius.md, borderWidth: StyleSheet.hairlineWidth, gap: spacing.xs },
  icon: { marginBottom: spacing.sm },
});
