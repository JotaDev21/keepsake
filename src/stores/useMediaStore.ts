import { create } from 'zustand';

import { mediaRepo } from '@/db/repositories';
import { deleteMedia, downloadMedia, generateVideoThumb, saveMedia } from '@/lib/media';
import type { SharedMediaItem } from '@/lib/shared-media';
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
  add: (personId: number, input: AddInput) => Promise<number>;
  saveSharedCopy: (personId: number, item: SharedMediaItem) => Promise<number>;
  remove: (id: number) => Promise<void>;
  updateSharing: (id: number, shared: boolean, remoteId: string | null) => void;
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
    let file: string | null = null;
    let thumbFile: string | null = null;
    try {
      file = await saveMedia(input.sourceUri, extFor(input.tipo));
      thumbFile = input.tipo === 'video' ? await generateVideoThumb(input.sourceUri) : null;
      const id = await mediaRepo.create({
        personId,
        tipo: input.tipo,
        file,
        thumbFile,
        legenda: input.legenda ?? null,
        dataMemoria: input.dataMemoria ?? null,
        local: input.local ?? null,
      });
      set({ items: await mediaRepo.listByPerson(personId) });
      return id;
    } catch (error) {
      if (file) deleteMedia(file);
      if (thumbFile) deleteMedia(thumbFile);
      throw error;
    }
  },

  saveSharedCopy: async (personId, item) => {
    let file: string | null = null;
    try {
      file = await downloadMedia(item.fileUrl, extFor(item.tipo));
      const id = await mediaRepo.create({
        personId,
        tipo: item.tipo,
        file,
        thumbFile: null,
        legenda: item.legenda,
        dataMemoria: item.dataMemoria,
        local: item.local,
        shared: false,
        // Keep provenance locally so the same received memory is not imported
        // repeatedly. `shared: false` means this device does not own the remote row.
        remoteId: item.id,
      });
      set({ items: await mediaRepo.listByPerson(personId) });
      return id;
    } catch (error) {
      if (file) deleteMedia(file);
      throw error;
    }
  },

  remove: async (id) => {
    const item = get().items.find((i) => i.id === id);
    // Remove the database reference first. A file-cleanup failure only leaves
    // an orphan; deleting files first could leave a live row pointing nowhere.
    await mediaRepo.delete(id);
    set({ items: get().items.filter((i) => i.id !== id) });
    if (item) {
      try {
        deleteMedia(item.file);
        if (item.thumbFile) deleteMedia(item.thumbFile);
      } catch (error) {
        console.warn('memory ev: limpeza de mídia pendente', error);
      }
    }
  },

  updateSharing: (id, shared, remoteId) => {
    set({
      items: get().items.map((item) => (item.id === id ? { ...item, shared, remoteId } : item)),
    });
  },
}));
