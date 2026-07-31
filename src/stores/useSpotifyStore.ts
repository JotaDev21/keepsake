import { create } from 'zustand';

import {
  clearSpotify,
  getCurrentlyPlaying,
  getSongOfDay,
  hydrateTokens,
  isSpotifyConfigured,
  isSpotifyConnected,
  setSongOfDay,
  type SpotifyTrack,
} from '@/lib/spotify';
import { startOfDay } from '@/lib/mood';

import { useSyncStore } from './useSyncStore';

interface SpotifyState {
  configured: boolean;
  connected: boolean;
  songOfDay: SpotifyTrack | null;
  nowPlaying: SpotifyTrack | null;
  /** Sync state from local storage (call at startup + when entering Música). */
  load: () => Promise<void>;
  markConnected: () => void;
  disconnect: () => void;
  setSong: (track: SpotifyTrack | null) => void;
  refreshNowPlaying: () => Promise<void>;
}

export const useSpotifyStore = create<SpotifyState>((set) => ({
  configured: isSpotifyConfigured,
  connected: false,
  songOfDay: null,
  nowPlaying: null,

  load: async () => {
    await hydrateTokens();
    set({ configured: isSpotifyConfigured, connected: isSpotifyConnected(), songOfDay: getSongOfDay() });
  },

  markConnected: () => set({ connected: true }),

  disconnect: () => {
    clearSpotify();
    set({ connected: false, nowPlaying: null });
  },

  setSong: (track) => {
    setSongOfDay(track);
    set({ songOfDay: track });
    // The day's song is part of the couple's soundtrack — mirror it to her app.
    useSyncStore.getState().pushSong(startOfDay(), track).catch(() => {});
  },

  refreshNowPlaying: async () => {
    if (!isSpotifyConnected()) return;
    try {
      set({ nowPlaying: await getCurrentlyPlaying() });
    } catch (e) {
      console.warn('ev: now playing falhou', e);
    }
  },
}));
