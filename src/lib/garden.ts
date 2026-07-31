/**
 * The garden's growth model. A single sunflower that only ever grows: its stage
 * is derived from the cumulative number of days shown up (never wilts on a
 * missed day — that would be unkind). The streak is a separate, gentle nudge.
 * When the couple is paired, the garden is one: both partners' days count.
 */
import type { GardenStats } from '@/types/models';

export interface GardenStage {
  key: string;
  label: string;
  /** A quiet line about where the flower is. */
  hint: string;
}

const STAGES: { min: number; stage: GardenStage }[] = [
  { min: 0, stage: { key: 'semente', label: 'Semente', hint: 'Plantada hoje. Volte amanhã para vê-la brotar.' } },
  { min: 2, stage: { key: 'broto', label: 'Broto', hint: 'Um fio verde rompeu a terra.' } },
  { min: 4, stage: { key: 'botao', label: 'Botão', hint: 'Fechado, guardando cor pra depois.' } },
  { min: 8, stage: { key: 'flor', label: 'Em flor', hint: 'As primeiras pétalas se abriram.' } },
  { min: 15, stage: { key: 'girassol', label: 'Girassol', hint: 'De pé, virada pro sol.' } },
  { min: 30, stage: { key: 'campo', label: 'Em pleno sol', hint: 'Um girassol que virou hábito.' } },
];

/** The stage for a given number of days shown up. */
export function gardenStage(total: number): GardenStage {
  let found = STAGES[0].stage;
  for (const s of STAGES) if (total >= s.min) found = s.stage;
  return found;
}

/** How far the flower is on the way to next stage — 0..1 (also its bloom). */
export function stageProgress(total: number): number {
  const idx = STAGES.reduce((acc, s, i) => (total >= s.min ? i : acc), 0);
  if (idx >= STAGES.length - 1) return 1;
  const from = STAGES[idx].min;
  const to = STAGES[idx + 1].min;
  return (total - from) / (to - from);
}

/**
 * Continuous bloom (0..1) for the Sunflower: each stage lifts the floor so the
 * flower visibly opens as it climbs, easing within a stage toward the next.
 */
export function bloomFor(total: number): number {
  if (total <= 0) return 0;
  const floors = [0.16, 0.34, 0.56, 0.78, 0.92, 1];
  const idx = STAGES.reduce((acc, s, i) => (total >= s.min ? i : acc), 0);
  const base = floors[idx];
  const nextFloor = floors[Math.min(idx + 1, floors.length - 1)];
  return Math.min(1, base + (nextFloor - base) * stageProgress(total));
}

/* ------------------------------------------------------- calendar walking */

/**
 * Calendar-day key (local): yyyymmdd as a number. Streaks walk real calendar
 * days instead of fixed 24h spans, so DST shifts and timezone changes never
 * break a run unfairly.
 */
export function dayKey(ms: number): number {
  const d = new Date(ms);
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
}

function shiftKey(key: number, deltaDays: number): number {
  const y = Math.floor(key / 10000);
  const m = Math.floor((key % 10000) / 100) - 1;
  const d = key % 100;
  return dayKey(new Date(y, m, d + deltaDays).getTime());
}

/** Compute streak / best / total from the set of visited days (any order). */
export function computeStats(dias: number[], today: number): GardenStats {
  const keys = new Set(dias.map(dayKey));
  const todayKey = dayKey(today);
  const total = keys.size;
  const todayVisited = keys.has(todayKey);

  // Current run ending today (or yesterday if today isn't logged yet).
  let streak = 0;
  let cursor: number | null = todayVisited
    ? todayKey
    : keys.has(shiftKey(todayKey, -1))
      ? shiftKey(todayKey, -1)
      : null;
  while (cursor != null && keys.has(cursor)) {
    streak += 1;
    cursor = shiftKey(cursor, -1);
  }

  // Longest run ever.
  const sorted = [...keys].sort((a, b) => a - b);
  let best = 0;
  let run = 0;
  let prev: number | null = null;
  for (const k of sorted) {
    run = prev != null && k === shiftKey(prev, 1) ? run + 1 : 1;
    if (run > best) best = run;
    prev = k;
  }

  return { total, streak, best, todayVisited };
}

/** Union of two visit-day lists (deduped by calendar day, original ms kept). */
export function unionDays(a: number[], b: number[]): number[] {
  const seen = new Set<number>();
  const out: number[] = [];
  for (const ms of [...a, ...b]) {
    const k = dayKey(ms);
    if (!seen.has(k)) {
      seen.add(k);
      out.push(ms);
    }
  }
  return out;
}
