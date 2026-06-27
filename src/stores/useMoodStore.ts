import { create } from 'zustand';

import { moodRepo } from '@/db/repositories';
import { startOfDay } from '@/lib/mood';
import type { MoodEntry, MoodEntryDraft } from '@/types/models';

import { useSyncStore } from './useSyncStore';

const DAY = 86400000;
const HISTORY_DAYS = 42;

interface MoodState {
  today: MoodEntry | null;
  history: MoodEntry[];
  load: (personId: number) => Promise<void>;
  save: (personId: number, draft: MoodEntryDraft) => Promise<void>;
}

async function refresh(personId: number) {
  const today = startOfDay();
  const [t, h] = await Promise.all([
    moodRepo.getByDay(personId, today),
    moodRepo.listRange(personId, today - (HISTORY_DAYS - 1) * DAY, today),
  ]);
  return { today: t, history: h };
}

export const useMoodStore = create<MoodState>((set) => ({
  today: null,
  history: [],

  load: async (personId) => {
    try {
      set(await refresh(personId));
    } catch (e) {
      console.warn('ev: falha ao carregar humor', e);
    }
  },

  save: async (personId, draft) => {
    await moodRepo.upsert(personId, draft);
    set(await refresh(personId));
    // Mirror to the partner's app (no-op if not paired / offline).
    useSyncStore.getState().pushMood(draft).catch(() => {});
  },
}));
