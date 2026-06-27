import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/design';
import { haptics } from '@/lib/haptics';

import { PressableScale } from './PressableScale';

/** Curated, warm-leaning accent hues — the person's color. */
const ACCENTS = [
  '#E2A86B',
  '#D98C90',
  '#CE8E72',
  '#C9A86B',
  '#9FB59A',
  '#8FB3C9',
  '#AEA6D6',
  '#C98AB0',
];

interface AccentPickerProps {
  value: string;
  onChange: (hex: string) => void;
}

export function AccentPicker({ value, onChange }: AccentPickerProps) {
  const theme = useTheme();

  return (
    <View style={styles.row}>
      {ACCENTS.map((c) => {
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
            <View style={[styles.ring, { borderColor: active ? theme.colors.text : 'transparent' }]}>
              <View style={[styles.disc, { backgroundColor: c }]} />
            </View>
          </PressableScale>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  // Constant-size ring so selecting adds a halo instead of shrinking the disc.
  ring: { padding: 3, borderWidth: 2, borderRadius: 25, alignItems: 'center', justifyContent: 'center' },
  disc: { width: 40, height: 40, borderRadius: 20 },
});
