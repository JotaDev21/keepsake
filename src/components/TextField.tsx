import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { fonts, radius as radiusTokens, spacing, useTheme } from '@/design';

import { Text } from './Text';

interface TextFieldProps extends Omit<TextInputProps, 'style' | 'placeholderTextColor'> {
  label?: string;
}

/** A themed text input with an optional overline label. */
export function TextField({ label, multiline, ...props }: TextFieldProps) {
  const theme = useTheme();

  return (
    <View style={styles.wrap}>
      {label ? (
        <Text variant="overline" color="textMuted" style={styles.label}>
          {label}
        </Text>
      ) : null}
      <TextInput
        placeholderTextColor={theme.colors.textFaint}
        multiline={multiline}
        style={[
          styles.input,
          {
            color: theme.colors.text,
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.border,
            borderRadius: radiusTokens.md,
            minHeight: multiline ? 100 : 52,
            textAlignVertical: multiline ? 'top' : 'center',
          },
        ]}
        {...props}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: spacing.lg },
  label: { marginBottom: spacing.sm },
  input: {
    fontFamily: fonts.sans,
    fontSize: 16,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
