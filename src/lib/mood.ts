/** The mood model: a calm 5-level scale + feeling tags + intensity (1–5). */
import { moodColors } from '@/design';

export interface MoodStep {
  key: string;
  label: string;
  color: string;
}

/** The 5-level emotional weather. Confirmed format: humor + intensidade + nota + tags. */
export const moodScale: MoodStep[] = [
  { key: 'pesado', label: 'Pesado', color: moodColors.pesado },
  { key: 'quieto', label: 'Quieto', color: moodColors.quieto },
  { key: 'sereno', label: 'Sereno', color: moodColors.sereno },
  { key: 'leve', label: 'Leve', color: moodColors.leve },
  { key: 'radiante', label: 'Radiante', color: moodColors.radiante },
];

export interface FeelingTag {
  key: string;
  label: string;
}

/** Feeling tags to mark alongside the mood. */
export const feelingTags: FeelingTag[] = [
  { key: 'grato', label: 'Grato' },
  { key: 'amor', label: 'Amor' },
  { key: 'saudade', label: 'Saudade' },
  { key: 'paz', label: 'Paz' },
  { key: 'esperancoso', label: 'Esperançoso' },
  { key: 'nostalgico', label: 'Nostálgico' },
  { key: 'alegre', label: 'Alegre' },
  { key: 'inquieto', label: 'Inquieto' },
  { key: 'ansioso', label: 'Ansioso' },
  { key: 'cansado', label: 'Cansado' },
];

/** Start-of-day epoch ms for a date (one mood entry per day). */
export function startOfDay(d: Date = new Date()): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

/** Color for a mood key (falls back to a muted tone). */
export function moodColor(key: string | null | undefined): string {
  return moodScale.find((m) => m.key === key)?.color ?? moodColors.fallback;
}

/** Index of a mood key in the scale, or null. */
export function moodIndex(key: string | null | undefined): number | null {
  const i = moodScale.findIndex((m) => m.key === key);
  return i >= 0 ? i : null;
}
