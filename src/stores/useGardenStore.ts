import { useMemo } from 'react';
import { create } from 'zustand';

import { visitRepo } from '@/db/repositories';
import { computeStats, dayKey, unionDays } from '@/lib/garden';
import { startOfDay } from '@/lib/mood';
import { useSyncStore } from '@/stores/useSyncStore';
import type { GardenStats } from '@/types/models';

interface GardenState {
  stats: GardenStats;
  /** The raw visited days (start-of-day ms), for combining with the partner's. */
  days: number[];
  /** Read the current growth from visited days. */
  load: (personId: number) => Promise<void>;
  /** Record showing up today, then refresh. Called on app open/foreground + caring acts. */
  water: (personId: number) => Promise<void>;
}

const EMPTY: GardenStats = { total: 0, streak: 0, best: 0, todayVisited: false };

async function read(personId: number): Promise<{ stats: GardenStats; days: number[] }> {
  const days = await visitRepo.listDays(personId);
  return { stats: computeStats(days, startOfDay()), days };
}

export const useGardenStore = create<GardenState>((set, get) => ({
  stats: EMPTY,
  days: [],

  load: async (personId) => {
    try {
      set(await read(personId));
    } catch (e) {
      console.warn('ev: falha ao carregar jardim', e);
    }
  },

  water: async (personId) => {
    try {
      const wasToday = get().stats.todayVisited;
      const dia = startOfDay();
      await visitRepo.record(personId, dia);
      set(await read(personId));
      // Mirror the new day so the shared garden feels it on her side too.
      if (!wasToday) useSyncStore.getState().pushVisit(dia).catch(() => {});
    } catch (e) {
      console.warn('ev: falha ao regar jardim', e);
    }
  },
}));

export interface CombinedGarden {
  stats: GardenStats;
  /** Whether this is the couple's garden (partner joined). */
  shared: boolean;
  /** She already showed up today. */
  partnerToday: boolean;
  /** You both showed up today — the garden's warmest state. */
  bothToday: boolean;
}

/** The garden as it should be felt: one flower, grown by both when paired. */
export function useCombinedGarden(): CombinedGarden {
  const stats = useGardenStore((s) => s.stats);
  const days = useGardenStore((s) => s.days);
  const partnerDays = useSyncStore((s) => s.partnerVisitDays);
  const shared = useSyncStore((s) => s.partnerJoined);

  return useMemo(() => {
    const todayKey = dayKey(startOfDay());
    const partnerToday = shared && partnerDays.some((d) => dayKey(d) === todayKey);
    if (!shared || partnerDays.length === 0) {
      return { stats, shared, partnerToday, bothToday: partnerToday && stats.todayVisited };
    }
    const combined = computeStats(unionDays(days, partnerDays), startOfDay());
    return {
      stats: { ...combined, todayVisited: stats.todayVisited },
      shared,
      partnerToday,
      bothToday: partnerToday && stats.todayVisited,
    };
  }, [stats, days, partnerDays, shared]);
}
