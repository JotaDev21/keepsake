import { ActivityIndicator, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { radius as radiusTokens, useTheme } from '@/design';

import { Icon, type IconName } from './Icon';
import { PressableScale } from './PressableScale';
import { Text } from './Text';

type ButtonVariant = 'primary' | 'secondary' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: IconName;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  /** Haptic on press-in (true → light tap). */
  haptic?: boolean | (() => void);
  style?: StyleProp<ViewStyle>;
}

const SIZES: Record<ButtonSize, { height: number; paddingH: number; gap: number; iconSize: number }> = {
  sm: { height: 38, paddingH: 16, gap: 6, iconSize: 16 },
  md: { height: 50, paddingH: 22, gap: 8, iconSize: 18 },
  lg: { height: 58, paddingH: 28, gap: 10, iconSize: 20 },
};

/** A button that breathes on touch. Three weights; restraint by default. */
export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  icon,
  disabled = false,
  loading = false,
  fullWidth = false,
  haptic,
  style,
}: ButtonProps) {
  const theme = useTheme();
  const s = SIZES[size];
  const isDisabled = disabled || loading;

  // Entardecer weights: primary glows in the accent, secondary rests on the
  // warm surface behind an amber hairline, ghost is just the accent speaking.
  const surface: ViewStyle =
    variant === 'primary'
      ? {
          backgroundColor: theme.colors.accent,
          experimental_backgroundImage: `linear-gradient(145deg, ${theme.colors.accentBloom} 0%, ${theme.colors.accent} 58%, ${theme.colors.seed} 150%)`,
          boxShadow: `0 10px 24px ${theme.colors.accentGlow}`,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: theme.colors.surfaceHighlight,
        }
      : variant === 'secondary'
        ? {
            backgroundColor: theme.colors.surface,
            experimental_backgroundImage: `linear-gradient(150deg, ${theme.colors.surfaceElevated} 0%, ${theme.colors.surface} 70%)`,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: theme.colors.borderStrong,
          }
        : { backgroundColor: 'transparent' };

  const contentColor =
    variant === 'primary' ? 'onAccent' : variant === 'ghost' ? 'accent' : 'text';

  return (
    <PressableScale
      onPress={onPress}
      disabled={isDisabled}
      haptic={haptic}
      accessibilityLabel={label}
      style={[
        styles.base,
        surface,
        {
          height: s.height,
          paddingHorizontal: s.paddingH,
          borderRadius: radiusTokens.pill,
          borderCurve: 'continuous',
          opacity: isDisabled ? 0.5 : 1,
        },
        fullWidth ? styles.fullWidth : null,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? theme.colors.onAccent : theme.colors.accent} />
      ) : (
        <View style={[styles.row, { gap: s.gap }]}>
          {icon ? <Icon name={icon} size={s.iconSize} color={contentColor} /> : null}
          <Text variant="callout" color={contentColor}>
            {label}
          </Text>
        </View>
      )}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  base: { alignItems: 'center', justifyContent: 'center', alignSelf: 'flex-start' },
  fullWidth: { alignSelf: 'stretch' },
  row: { flexDirection: 'row', alignItems: 'center' },
});
