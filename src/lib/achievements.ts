import type { IconName } from '@/components';
import { dayKey } from '@/lib/garden';

/**
 * Achievements are shared memories, not engagement bait. Every item comes
 * from an action both people can see; private notes and moods never count.
 */
export const ACHIEVEMENTS = [
  {
    key: 'dois_lados',
    title: 'Dois lados, um lugar',
    description: 'Os dois celulares encontraram o mesmo jardim.',
    icon: 'link' as IconName,
  },
  {
    key: 'mesmo_dia',
    title: 'No mesmo dia',
    description: 'Vocês dois apareceram para cuidar do jardim.',
    icon: 'sun' as IconName,
  },
  {
    key: 'tres_encontros',
    title: 'Três encontros',
    description: 'Três dias em que os dois estiveram presentes.',
    icon: 'users' as IconName,
  },
  {
    key: 'sete_encontros',
    title: 'Uma constelação',
    description: 'Sete dias compartilhados viraram história.',
    icon: 'star' as IconName,
  },
  {
    key: 'agua_juntos',
    title: 'Brinde de água',
    description: 'Os dois alcançaram a própria meta no mesmo dia.',
    icon: 'droplet' as IconName,
  },
  {
    key: 'primeira_memoria',
    title: 'Primeiro relicário',
    description: 'A primeira memória foi dividida entre vocês.',
    icon: 'image' as IconName,
  },
  {
    key: 'dez_memorias',
    title: 'Dez pedaços de nós',
    description: 'Dez memórias agora vivem no acervo compartilhado.',
    icon: 'layers' as IconName,
  },
  {
    key: 'resposta_encontro',
    title: 'Entre duas respostas',
    description: 'Uma pergunta só se abriu quando os dois responderam.',
    icon: 'message-circle' as IconName,
  },
] as const;

export type AchievementKey = (typeof ACHIEVEMENTS)[number]['key'];

export interface SharedAchievement {
  key: AchievementKey;
  unlockedBy: string;
  unlockedAt: number;
  metadata: Record<string, unknown>;
}

const KEYS = new Set<string>(ACHIEVEMENTS.map((item) => item.key));

export function isAchievementKey(value: unknown): value is AchievementKey {
  return typeof value === 'string' && KEYS.has(value);
}

/** Days on which both people visited — union streaks must not unlock these. */
export function sharedVisitCount(mine: number[], theirs: number[]): number {
  const partner = new Set(theirs.map(dayKey));
  return new Set(mine.map(dayKey).filter((day) => partner.has(day))).size;
}

