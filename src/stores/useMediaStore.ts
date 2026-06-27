import { create } from 'zustand';

import { mediaRepo } from '@/db/repositories';
import { deleteMedia, generateVideoThumb, saveMedia } from '@/lib/media';
import type { MediaItem, MediaType } from '@/types/models';

interface AddInput {
  tipo: MediaType;
  /** External (picked/recorded/captured) uri to copy into the sandbox. */
  sourceUri: string;
  legenda?: string | null;
  dataMemoria?: number | null;
  local?: string | null;
}

interface MediaState {
  items: MediaItem[];
  load: (personId: number) => Promise<void>;
  add: (personId: number, input: AddInput) => Promise<void>;
  remove: (id: number) => Promise<void>;
}

const extFor = (tipo: MediaType): string =>
  tipo === 'audio' ? 'm4a' : tipo === 'video' ? 'mp4' : 'jpg';

export const useMediaStore = create<MediaState>((set, get) => ({
  items: [],

  load: async (personId) => {
    try {
      set({ items: await mediaRepo.listByPerson(personId) });
    } catch (e) {
      console.warn('ev: falha ao carregar mídia', e);
    }
  },

  add: async (personId, input) => {
    const file = await saveMedia(input.sourceUri, extFor(input.tipo));
    const thumbFile = input.tipo === 'video' ? await generateVideoThumb(input.sourceUri) : null;
    await mediaRepo.create({
      personId,
      tipo: input.tipo,
      file,
      thumbFile,
      legenda: input.legenda ?? null,
      dataMemoria: input.dataMemoria ?? null,
      local: input.local ?? null,
    });
    set({ items: await mediaRepo.listByPerson(personId) });
  },

  remove: async (id) => {
    const item = get().items.find((i) => i.id === id);
    if (item) {
      deleteMedia(item.file);
      if (item.thumbFile) deleteMedia(item.thumbFile);
    }
    await mediaRepo.delete(id);
    set({ items: get().items.filter((i) => i.id !== id) });
  },
}));
