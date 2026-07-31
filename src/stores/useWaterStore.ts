import { create } from 'zustand';

import { waterRepo } from '@/db/repositories';
import { startOfDay } from '@/lib/mood';
import { prefs } from '@/lib/prefs';
import { useSyncStore } from '@/stores/useSyncStore';

/** One glass of the couple's water — the tap unit. */
export const GLASS_ML = 250;

interface WaterState {
  /** Ml drunk today on this device. */
  todayMl: number;
  load: (personId: number) => Promise<void>;
  /** Add (or, negative, undo) ml for today; mirrors to her side. */
  add: (personId: number, deltaMl: number) => Promise<void>;
}

export const useWaterStore = create<WaterState>((set) => ({
  todayMl: 0,

  load: async (personId) => {
    try {
      set({ todayMl: await waterRepo.get(personId, startOfDay()) });
    } catch (e) {
      console.warn('ev: falha ao carregar água', e);
    }
  },

  add: async (personId, deltaMl) => {
    try {
      const dia = startOfDay();
      const ml = await waterRepo.add(personId, dia, deltaMl);
      set({ todayMl: ml });
      // Her glass fills on her screen too (queued if offline).
      useSyncStore.getState().pushWater(dia, ml, prefs.getWaterGoalMl()).catch(() => {});
    } catch (e) {
      console.warn('ev: falha ao registrar água', e);
    }
  },
}));
