import { useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';

import { radius as radiusTokens, spacing, useTheme } from '@/design';
import { formatDate } from '@/lib/format';
import { haptics } from '@/lib/haptics';

import { Icon } from './Icon';
import { PressableScale } from './PressableScale';
import { Text } from './Text';

interface DatePickerFieldProps {
  value: Date;
  onChange: (date: Date) => void;
  label?: string;
}

/** A tappable field that opens the native date picker (Android dialog / iOS inline). */
export function DatePickerField({ value, onChange, label }: DatePickerFieldProps) {
  const theme = useTheme();
  const [showIOS, setShowIOS] = useState(false);

  const open = () => {
    haptics.selection();
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value,
        mode: 'date',
        onChange: (_event, d) => {
          if (d) onChange(d);
        },
      });
    } else {
      setShowIOS(true);
    }
  };

  return (
    <View>
      {label ? (
        <Text variant="overline" color="textMuted" style={styles.label}>
          {label}
        </Text>
      ) : null}
      <PressableScale
        onPress={open}
        haptic={false}
        accessibilityLabel={label ?? 'Escolher data'}
        style={[
          styles.field,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.border,
            borderRadius: radiusTokens.md,
          },
        ]}
      >
        <Icon name="calendar" size={16} color="textSecondary" />
        <Text variant="callout" color="text">
          {formatDate(value)}
        </Text>
      </PressableScale>
      {showIOS && Platform.OS === 'ios' ? (
        <DateTimePicker
          value={value}
          mode="date"
          display="inline"
          onChange={(_event, d) => {
            setShowIOS(false);
            if (d) onChange(d);
          }}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  label: { marginBottom: spacing.sm },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
