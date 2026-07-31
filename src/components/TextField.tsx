import { useState } from 'react';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { fonts, radius as radiusTokens, spacing, useTheme } from '@/design';

import { Text } from './Text';

interface TextFieldProps extends Omit<TextInputProps, 'style' | 'placeholderTextColor'> {
  label?: string;
}

/**
 * A themed text input with an optional golden overline label. The warm
 * hairline border lights up in the accent while the field is focused.
 */
export function TextField({ label, multiline, onFocus, onBlur, ...props }: TextFieldProps) {
  const theme = useTheme();
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.wrap}>
      {label ? (
        <Text variant="overline" color="accent" style={styles.label}>
          {label}
        </Text>
      ) : null}
      <TextInput
        placeholderTextColor={theme.colors.textFaint}
        multiline={multiline}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        style={[
          styles.input,
          {
            color: theme.colors.text,
            backgroundColor: theme.colors.surface,
            experimental_backgroundImage: `linear-gradient(160deg, ${theme.colors.surfaceElevated} 0%, ${theme.colors.surface} 60%)`,
            borderColor: focused ? theme.colors.accentEdge : theme.colors.border,
            borderRadius: radiusTokens.md,
            borderCurve: 'continuous',
            boxShadow: focused ? `0 8px 22px ${theme.colors.accentSoft}` : undefined,
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
