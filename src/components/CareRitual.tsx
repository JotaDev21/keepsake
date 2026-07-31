import { StyleSheet, View } from 'react-native';

import { radius, spacing, useTheme, withAlpha } from '@/design';
import { CARE_OPTIONS, type CareKind } from '@/lib/care';
import { useCareStore } from '@/stores/useCareStore';

import { Icon } from './Icon';
import { PressableScale } from './PressableScale';
import { Text } from './Text';

export function CareRitual({
  partnerName,
  partnerJoined,
}: {
  partnerName: string;
  partnerJoined: boolean;
}) {
  const theme = useTheme();
  const mine = useCareStore((state) => state.mine);
  const partner = useCareStore((state) => state.partner);
  const sharing = useCareStore((state) => state.sharing);
  const toggle = useCareStore((state) => state.toggle);
  const setSharing = useCareStore((state) => state.setSharing);

  const mineHas = (kind: CareKind) => mine.some((signal) => signal.kind === kind);
  const partnerHas = (kind: CareKind) => partner.some((signal) => signal.kind === kind);

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
          experimental_backgroundImage: `linear-gradient(155deg, ${theme.colors.surfaceElevated} 0%, ${theme.colors.surface} 66%)`,
        },
      ]}
    >
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text variant="overline" color="textMuted">Cuidado de hoje</Text>
          <Text variant="title2" color="text" style={styles.title}>Pequeno também conta</Text>
          <Text variant="subhead" color="textMuted" style={styles.subtitle}>
            Sem sequência, pontuação ou cobrança. Só sinais de que vocês se cuidaram.
          </Text>
        </View>
        <View style={[styles.seal, { backgroundColor: theme.colors.accentSoft }]}>
          <Icon name="feather" size={18} color="accent" />
        </View>
      </View>

      <View style={styles.legend}>
        <Text variant="caption" color="textMuted">Você</Text>
        <View style={[styles.legendLine, { backgroundColor: theme.colors.border }]} />
        <Text variant="caption" color="textMuted" numberOfLines={1}>{partnerName}</Text>
      </View>

      <View style={styles.signals}>
        {CARE_OPTIONS.map((option) => {
          const checked = mineHas(option.kind);
          const partnerChecked = partnerHas(option.kind);
          return (
            <PressableScale
              key={option.kind}
              onPress={() => void toggle(option.kind)}
              haptic={false}
              accessibilityRole="checkbox"
              accessibilityState={{ checked }}
              accessibilityLabel={option.label}
              style={[
                styles.signal,
                {
                  backgroundColor: checked ? theme.colors.accentSoft : theme.colors.surfaceHighlight,
                  borderColor: checked ? theme.colors.accentEdge : theme.colors.border,
                },
              ]}
            >
              <View
                style={[
                  styles.icon,
                  { backgroundColor: checked ? withAlpha(theme.colors.accent, 0.18) : theme.colors.surfaceElevated },
                ]}
              >
                <Icon name={option.icon} size={17} color={checked ? 'accent' : 'textMuted'} />
              </View>
              <Text variant="callout" color={checked ? 'text' : 'textSecondary'} style={styles.signalLabel}>
                {option.label}
              </Text>
              <View
                style={[
                  styles.status,
                  {
                    backgroundColor: checked ? theme.colors.accent : 'transparent',
                    borderColor: checked ? theme.colors.accent : theme.colors.borderStrong,
                  },
                ]}
              >
                {checked ? <Icon name="check" size={12} color="onAccent" /> : null}
              </View>
              <View
                style={[
                  styles.partnerStatus,
                  {
                    backgroundColor: partnerChecked ? theme.colors.accentSoft : 'transparent',
                    borderColor: partnerChecked ? theme.colors.accentEdge : theme.colors.border,
                  },
                ]}
              >
                <Icon
                  name={partnerChecked ? 'check' : partnerJoined && sharing ? 'minus' : 'lock'}
                  size={11}
                  color={partnerChecked ? 'accent' : 'textFaint'}
                />
              </View>
            </PressableScale>
          );
        })}
      </View>

      {partnerJoined && !sharing ? (
        <PressableScale
          onPress={() => void setSharing(true)}
          accessibilityLabel={`Dividir sinais de cuidado com ${partnerName}`}
          style={[styles.consent, { backgroundColor: theme.colors.accentSoft, borderColor: theme.colors.accentEdge }]}
        >
          <Icon name="lock" size={15} color="accent" />
          <View style={styles.consentCopy}>
            <Text variant="callout" color="accent">Dividir meus sinais com {partnerName}</Text>
            <Text variant="caption" color="textMuted">
              Só o gesto marcado hoje. Sem horário detalhado, nota ou histórico.
            </Text>
          </View>
          <Icon name="chevron-right" size={18} color="accent" />
        </PressableScale>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: spacing.lg,
    borderRadius: radius.xl,
    borderCurve: 'continuous',
    borderWidth: StyleSheet.hairlineWidth,
  },
  header: { flexDirection: 'row', gap: spacing.md },
  headerCopy: { flex: 1 },
  title: { marginTop: spacing.xs },
  subtitle: { marginTop: spacing.sm },
  seal: { width: 40, height: 40, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  legend: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xl,
    paddingRight: spacing.xs,
  },
  legendLine: { width: 18, height: StyleSheet.hairlineWidth },
  signals: { gap: spacing.sm, marginTop: spacing.sm },
  signal: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radius.lg,
    borderCurve: 'continuous',
    borderWidth: StyleSheet.hairlineWidth,
  },
  icon: { width: 34, height: 34, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  signalLabel: { flex: 1 },
  status: {
    width: 23,
    height: 23,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  partnerStatus: {
    width: 23,
    height: 23,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  consent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.lg,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  consentCopy: { flex: 1, gap: spacing.xs },
});
