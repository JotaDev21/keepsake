import { StyleSheet, View } from 'react-native';

import { radius as radiusTokens, useTheme } from '@/design';
import { haptics } from '@/lib/haptics';

import { Icon, type IconName } from './Icon';
import { PressableScale } from './PressableScale';
import { Text } from './Text';

interface ChipProps {
  label: string;
  icon?: IconName;
  selected?: boolean;
  onPress?: () => void;
}

/** A small pill — filters, tags, countdown badges. */
export function Chip({ label, icon, selected = false, onPress }: ChipProps) {
  const theme = useTheme();
  const fg = selected ? 'accent' : 'textSecondary';

  const body = (
    <View
      style={[
        styles.chip,
        {
          backgroundColor: selected ? theme.colors.accentSoft : theme.colors.surfaceElevated,
          borderColor: selected ? theme.colors.accent : theme.colors.border,
        },
      ]}
    >
      {icon ? <Icon name={icon} size={14} color={fg} /> : null}
      <Text variant="subhead" color={fg}>
        {label}
      </Text>
    </View>
  );

  if (!onPress) return body;

  return (
    <PressableScale onPress={onPress} haptic={() => haptics.selection()} accessibilityLabel={label}>
      {body}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 34,
    paddingHorizontal: 14,
    borderRadius: radiusTokens.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
