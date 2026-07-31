import { StyleSheet, View } from 'react-native';

import { accentPresets, radius as radiusTokens, spacing, useTheme } from '@/design';
import { haptics } from '@/lib/haptics';

import { Icon } from './Icon';
import { PressableScale } from './PressableScale';

interface AccentPickerProps {
  value: string;
  onChange: (hex: string) => void;
}

export function AccentPicker({ value, onChange }: AccentPickerProps) {
  const theme = useTheme();

  return (
    <View style={styles.row}>
      {accentPresets.map((c) => {
        const active = value.toLowerCase() === c.toLowerCase();
        return (
          <PressableScale
            key={c}
            onPress={() => {
              onChange(c);
              haptics.selection();
            }}
            haptic={false}
            scaleTo={0.85}
            accessibilityLabel={`Cor ${c}`}
          >
            <View
              style={[styles.ring, { borderColor: active ? theme.colors.accentEdge : 'transparent' }]}
            >
              <View style={[styles.disc, { backgroundColor: c, borderColor: theme.colors.border }]}>
                {/* The swatch shows the RAW hue in both modes, so the check
                    needs a fixed dark ink — day-mode onAccent (cream) vanishes. */}
                {active ? <Icon name="check" size={18} color="seedDeep" /> : null}
              </View>
            </View>
          </PressableScale>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  // Constant-size ring so selecting adds a halo instead of shrinking the disc.
  ring: {
    padding: 3,
    borderWidth: 2,
    borderRadius: radiusTokens.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disc: {
    width: 40,
    height: 40,
    borderRadius: radiusTokens.pill,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
