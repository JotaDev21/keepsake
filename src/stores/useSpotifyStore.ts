import { create } from 'zustand';

import {
  clearSpotify,
  getCurrentlyPlaying,
  getSongOfDay,
  isSpotifyConfigured,
  isSpotifyConnected,
  setSongOfDay,
  type SpotifyTrack,
} from '@/lib/spotify';

interface SpotifyState {
  configured: boolean;
  connected: boolean;
  songOfDay: SpotifyTrack | null;
  nowPlaying: SpotifyTrack | null;
  /** Sync state from local storage (call at startup + when entering Música). */
  load: () => void;
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

  load: () =>
    set({ configured: isSpotifyConfigured, connected: isSpotifyConnected(), songOfDay: getSongOfDay() }),

  markConnected: () => set({ connected: true }),

  disconnect: () => {
    clearSpotify();
    set({ connected: false, nowPlaying: null });
  },

  setSong: (track) => {
    setSongOfDay(track);
    set({ songOfDay: track });
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
