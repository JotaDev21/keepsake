import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import { radius, spacing, useTheme } from '@/design';
import { haptics } from '@/lib/haptics';
import {
  isPulseFresh,
  pulseOption,
  pulseOptions,
  pulseResponseLabel,
  pulseResponseOptions,
  type PulseKind,
  type PulseResponse,
  type PulseResponseKind,
  type QuickPulse,
} from '@/lib/pulse';
import { useNow } from '@/lib/useNow';
import { Icon } from './Icon';
import { MemberAvatar } from './MemberAvatar';
import { PressableScale } from './PressableScale';
import { Text } from './Text';

interface PulseCardProps {
  partnerName: string;
  partnerAvatarUrl?: string | null;
  partnerPresenceLabel?: string | null;
  myPulse: QuickPulse | null;
  partnerPulse: QuickPulse | null;
  myPulseSeenAt?: number | null;
  responseToMyPulse?: PulseResponse | null;
  myResponseToPartnerPulse?: PulseResponse | null;
  disabled?: boolean;
  onSelect: (kind: PulseKind) => void;
  onRespond: (kind: PulseResponseKind) => void;
}

function remainingLabel(expiresAt: number, now: number): string {
  const minutes = Math.max(1, Math.ceil((expiresAt - now) / 60_000));
  if (minutes < 60) return `por mais ${minutes} min`;
  const hours = Math.ceil(minutes / 60);
  return `por mais ${hours}h`;
}

export function PulseCard({
  partnerName,
  partnerAvatarUrl,
  partnerPresenceLabel,
  myPulse,
  partnerPulse,
  myPulseSeenAt,
  responseToMyPulse,
  myResponseToPartnerPulse,
  disabled = false,
  onSelect,
  onRespond,
}: PulseCardProps) {
  const theme = useTheme();
  const now = useNow();
  const activeMine = isPulseFresh(myPulse, now) ? myPulse : null;
  const activePartner = isPulseFresh(partnerPulse, now) ? partnerPulse : null;
  const partnerOption = activePartner ? pulseOption(activePartner.kind) : null;

  const select = (kind: PulseKind) => {
    haptics.selection();
    onSelect(kind);
  };

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
        },
      ]}
    >
      <View style={styles.heading}>
        <MemberAvatar name={partnerName} uri={partnerAvatarUrl} size={spacing.xxxl} />
        <View style={styles.headingCopy}>
          <Text variant="overline" color="textMuted">
            Entre vocês
          </Text>
          <Text variant="title2" color="text" style={styles.title}>
            Um pequeno sinal
          </Text>
        </View>
      </View>

      {partnerOption ? (
        <Animated.View
          entering={FadeIn.springify().damping(22).stiffness(130)}
          exiting={FadeOut.springify().damping(24).stiffness(150)}
          style={[
            styles.partnerSignal,
            {
              backgroundColor: theme.colors.accentSoft,
              borderColor: theme.colors.accentEdge,
              experimental_backgroundImage: `linear-gradient(140deg, ${theme.colors.accentSoft} 0%, ${theme.colors.surface} 135%)`,
            },
          ]}
        >
          <MemberAvatar name={partnerName} uri={partnerAvatarUrl} size={42} />
          <View style={styles.flex}>
            <Text variant="overline" color="accent">
              {partnerName}, agora
            </Text>
            <Text variant="callout" color="text">
              {partnerOption.label}
            </Text>
          </View>
          <Icon name={partnerOption.icon} size={18} color="accent" />
        </Animated.View>
      ) : (
        <View style={styles.quiet}>
          <Text variant="caption" color="textMuted">
            Quando {partnerName} deixar um sinal, ele aparece aqui.
          </Text>
          {partnerPresenceLabel ? (
            <View style={styles.presence}>
              <View style={[styles.presenceDot, { backgroundColor: theme.colors.accent }]} />
              <Text variant="caption" color="textMuted" style={styles.wrappingText}>
                {partnerPresenceLabel}
              </Text>
            </View>
          ) : null}
        </View>
      )}

      {activePartner ? (
        <Animated.View
          entering={FadeIn.springify().damping(22).stiffness(130)}
          style={styles.responseSection}
        >
          <Text variant="overline" color="textMuted">
            Responder com cuidado
          </Text>
          <View style={styles.responses}>
            {pulseResponseOptions.map((option) => {
              const selected = myResponseToPartnerPulse?.kind === option.key;
              return (
                <PressableScale
                  key={option.key}
                  disabled={disabled}
                  haptic={false}
                  scaleTo={0.97}
                  accessibilityLabel={`Responder: ${option.label}`}
                  onPress={() => onRespond(option.key)}
                  style={[
                    styles.response,
                    {
                      backgroundColor: selected
                        ? theme.colors.accentSoft
                        : theme.colors.surfaceElevated,
                      borderColor: selected ? theme.colors.accentEdge : theme.colors.border,
                    },
                  ]}
                >
                  <Icon
                    name={selected ? 'check' : option.icon}
                    size={14}
                    color={selected ? 'accent' : 'textMuted'}
                  />
                  <Text variant="caption" color={selected ? 'accent' : 'textSecondary'} style={styles.wrappingText}>
                    {option.label}
                  </Text>
                </PressableScale>
              );
            })}
          </View>
        </Animated.View>
      ) : null}

      <Text variant="overline" color="textMuted" style={styles.sectionLabel}>
        O que você quer dizer agora?
      </Text>
      <View style={styles.options}>
        {pulseOptions.map((option) => {
          const selected = activeMine?.kind === option.key;
          return (
            <PressableScale
              key={option.key}
              disabled={disabled}
              haptic={false}
              scaleTo={0.96}
              accessibilityLabel={`Compartilhar: ${option.label}`}
              accessibilityState={{ selected, disabled }}
              onPress={() => select(option.key)}
              style={[
                styles.option,
                {
                  backgroundColor: selected
                    ? theme.colors.accentSoft
                    : theme.colors.surfaceElevated,
                  borderColor: selected ? theme.colors.accentEdge : theme.colors.border,
                  opacity: disabled ? 0.55 : 1,
                },
              ]}
            >
              <Icon
                name={option.icon}
                size={spacing.lg}
                color={selected ? 'accent' : 'textSecondary'}
              />
              <Text
                variant="caption"
                color={selected ? 'accent' : 'textSecondary'}
                style={styles.wrappingText}
              >
                {option.label}
              </Text>
            </PressableScale>
          );
        })}
      </View>

      {activeMine ? (
        <Animated.View
          key={`${activeMine.id}:${activeMine.kind}`}
          entering={FadeIn.springify().damping(24).stiffness(150)}
          exiting={FadeOut.springify().damping(24).stiffness(150)}
          style={styles.sent}
        >
          <Icon name="check" size={14} color="accent" />
          <Text variant="caption" color="textMuted">
            Compartilhado {remainingLabel(activeMine.expiresAt, now)}
          </Text>
        </Animated.View>
      ) : null}

      {activeMine && responseToMyPulse ? (
        <Animated.View
          entering={FadeIn.springify().damping(22).stiffness(130)}
          style={[
            styles.replyReceived,
            {
              backgroundColor: theme.colors.accentSoft,
              borderColor: theme.colors.accentEdge,
            },
          ]}
        >
          <Icon name="heart" size={15} color="accent" />
          <Text variant="caption" color="text">
            {partnerName}: {pulseResponseLabel(responseToMyPulse.kind)}
          </Text>
        </Animated.View>
      ) : activeMine && myPulseSeenAt ? (
        <View style={styles.seen}>
          <Icon name="check-circle" size={14} color="textMuted" />
          <Text variant="caption" color="textMuted">
            {partnerName} viu
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrappingText: { flexShrink: 1 },
  flex: { flex: 1 },
  card: {
    gap: spacing.md,
    paddingVertical: spacing.lg,
    borderRadius: radius.lg,
    borderCurve: 'continuous',
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  heading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  headingCopy: { flex: 1 },
  title: { marginTop: spacing.xs },
  partnerSignal: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginHorizontal: spacing.lg,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderCurve: 'continuous',
    borderWidth: StyleSheet.hairlineWidth,
  },
  quiet: { gap: spacing.xs, paddingHorizontal: spacing.lg },
  presence: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  presenceDot: { width: 5, height: 5, borderRadius: radius.pill },
  options: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  responses: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  responseSection: {
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  sectionLabel: { paddingHorizontal: spacing.lg },
  response: {
    minHeight: spacing.xxxl,
    maxWidth: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    borderCurve: 'continuous',
    borderWidth: StyleSheet.hairlineWidth,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: spacing.xxxl,
    maxWidth: '100%',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.sm,
    borderCurve: 'continuous',
    borderWidth: StyleSheet.hairlineWidth,
  },
  sent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
  },
  replyReceived: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  seen: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
  },
});
