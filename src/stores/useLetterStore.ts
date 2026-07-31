import { create } from 'zustand';

import { letterRepo } from '@/db/repositories';
import type { Letter, LetterDraft } from '@/types/models';

import { useSyncStore } from './useSyncStore';

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
    // Deliver to her device (no-op if not paired; queued if offline).
    useSyncStore.getState().pushLetter(id).catch(() => {});
    return id;
  },

  open: async (id) => {
    // Read from the DB, not the in-memory list — a notification deep link can
    // land here before the letters screen ever loaded.
    const letter = await letterRepo.getById(id);
    await letterRepo.markOpened(id);
    set({ letters: get().letters.map((l) => (l.id === id ? { ...l, aberta: true } : l)) });
    // Tell the author their letter was opened (the quiet "lida" on their side).
    if (letter?.direcao === 'recebida' && letter.remoteId) {
      useSyncStore.getState().pushLetterOpened(letter.remoteId).catch(() => {});
    }
  },

  remove: async (id) => {
    await letterRepo.delete(id);
    set({ letters: get().letters.filter((l) => l.id !== id) });
  },
}));
