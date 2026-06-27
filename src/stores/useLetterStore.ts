import { create } from 'zustand';

import { letterRepo } from '@/db/repositories';
import type { Letter, LetterDraft } from '@/types/models';

interface LetterState {
  letters: Letter[];
  load: (personId: number) => Promise<void>;
  create: (personId: number, draft: LetterDraft) => Promise<number>;
  open: (id: number) => Promise<void>;
  remove: (id: number) => Promise<void>;
}

export const useLetterStore = create<LetterState>((set, get) => ({
  letters: [],

  load: async (personId) => {
    try {
      set({ letters: await letterRepo.listByPerson(personId) });
    } catch (e) {
      console.warn('ev: falha ao carregar cartas', e);
    }
  },

  create: async (personId, draft) => {
    const id = await letterRepo.create(personId, draft);
    set({ letters: await letterRepo.listByPerson(personId) });
    return id;
  },

  open: async (id) => {
    await letterRepo.markOpened(id);
    set({ letters: get().letters.map((l) => (l.id === id ? { ...l, aberta: true } : l)) });
  },

  remove: async (id) => {
    await letterRepo.delete(id);
    set({ letters: get().letters.filter((l) => l.id !== id) });
  },
}));
