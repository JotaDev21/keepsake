import { create } from 'zustand';

import { reasonRepo } from '@/db/repositories';
import type { Reason } from '@/types/models';

import { useGardenStore } from './useGardenStore';

interface ReasonState {
  items: Reason[];
  load: (personId: number) => Promise<void>;
  add: (personId: number, texto: string) => Promise<void>;
  remove: (personId: number, id: number) => Promise<void>;
}

export const useReasonStore = create<ReasonState>((set) => ({
  items: [],

  load: async (personId) => {
    try {
      set({ items: await reasonRepo.listByPerson(personId) });
    } catch (e) {
      console.warn('ev: falha ao carregar motivos', e);
    }
  },

  add: async (personId, texto) => {
    await reasonRepo.create(personId, texto);
    set({ items: await reasonRepo.listByPerson(personId) });
    // Writing one down is showing up.
    useGardenStore.getState().water(personId).catch(() => {});
  },

  remove: async (personId, id) => {
    await reasonRepo.delete(id);
    set({ items: await reasonRepo.listByPerson(personId) });
  },
}));
