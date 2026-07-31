import type { IconName } from '@/components';

export type CareKind = 'refeicao' | 'pausa' | 'movimento' | 'descanso';

export interface CareSignal {
  kind: CareKind;
  completedAt: number;
}

export const CARE_OPTIONS: readonly {
  kind: CareKind;
  label: string;
  quietLabel: string;
  icon: IconName;
}[] = [
  { kind: 'refeicao', label: 'Comi algo', quietLabel: 'alimentação', icon: 'coffee' },
  { kind: 'pausa', label: 'Fiz uma pausa', quietLabel: 'uma pausa', icon: 'wind' },
  { kind: 'movimento', label: 'Mexi o corpo', quietLabel: 'movimento', icon: 'activity' },
  { kind: 'descanso', label: 'Me permiti descansar', quietLabel: 'descanso', icon: 'moon' },
];

export function isCareKind(value: unknown): value is CareKind {
  return CARE_OPTIONS.some((option) => option.kind === value);
}
