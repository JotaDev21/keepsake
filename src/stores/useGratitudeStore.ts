import { create } from 'zustand';

import { gratitudeRepo } from '@/db/repositories';
import { startOfDay } from '@/lib/mood';
import type { Gratitude } from '@/types/models';

import { useGardenStore } from './useGardenStore';

interface GratitudeState {
  items: Gratitude[];
  load: (personId: number) => Promise<void>;
  add: (personId: number, texto: string) => Promise<void>;
  remove: (personId: number, id: number) => Promise<void>;
}

export const useGratitudeStore = create<GratitudeState>((set) => ({
  items: [],

  load: async (personId) => {
    try {
      set({ items: await gratitudeRepo.listRecent(personId) });
    } catch (e) {
      console.warn('ev: falha ao carregar gratidão', e);
    }
  },

  add: async (personId, texto) => {
    const dia = startOfDay();
    await gratitudeRepo.create(personId, dia, texto);
    set({ items: await gratitudeRepo.listRecent(personId) });
    // Naming what you're grateful for waters the garden.
    useGardenStore.getState().water(personId).catch(() => {});
  },

  remove: async (personId, id) => {
    await gratitudeRepo.delete(id);
    set({ items: await gratitudeRepo.listRecent(personId) });
  },
}));
