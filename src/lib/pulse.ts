import type { IconName } from '@/components/Icon';

export type PulseKind =
  | 'bem'
  | 'carinho'
  | 'pesado'
  | 'conversar'
  | 'espaco';

export interface QuickPulse {
  id: string;
  kind: PulseKind;
  createdAt: number;
  expiresAt: number;
}

export type PulseResponseKind = 'aqui' | 'conversar' | 'espaco';

export interface PulseResponse {
  id: string;
  pulseId: string;
  kind: PulseResponseKind;
  createdAt: number;
}

export const pulseResponseOptions: {
  key: PulseResponseKind;
  label: string;
  icon: IconName;
}[] = [
  { key: 'aqui', label: 'Tô aqui', icon: 'heart' },
  { key: 'conversar', label: 'Quer conversar?', icon: 'message-circle' },
  { key: 'espaco', label: 'Vou te dar espaço', icon: 'moon' },
];

export interface PulseOption {
  key: PulseKind;
  label: string;
  icon: IconName;
}

export const PULSE_TTL_MS = 8 * 60 * 60 * 1000;

export const pulseOptions: PulseOption[] = [
  { key: 'bem', label: 'Tô bem', icon: 'sun' },
  { key: 'carinho', label: 'Preciso de carinho', icon: 'heart' },
  { key: 'pesado', label: 'Dia pesado', icon: 'cloud-rain' },
  { key: 'conversar', label: 'Quero conversar', icon: 'message-circle' },
  { key: 'espaco', label: 'Preciso de espaço', icon: 'moon' },
];

export function pulseOption(kind: PulseKind): PulseOption {
  return pulseOptions.find((option) => option.key === kind) ?? pulseOptions[0];
}

export function isPulseKind(value: unknown): value is PulseKind {
  return pulseOptions.some((option) => option.key === value);
}

export function isPulseResponseKind(value: unknown): value is PulseResponseKind {
  return pulseResponseOptions.some((option) => option.key === value);
}

export function pulseResponseLabel(kind: PulseResponseKind): string {
  return pulseResponseOptions.find((option) => option.key === kind)?.label ?? kind;
}

export function isPulseFresh(pulse: QuickPulse | null, now = Date.now()): pulse is QuickPulse {
  return pulse != null && pulse.expiresAt > now;
}
