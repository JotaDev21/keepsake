import * as AuthSession from 'expo-auth-session';
import { Storage } from 'expo-sqlite/kv-store';

export const SPOTIFY_CLIENT_ID = process.env.EXPO_PUBLIC_SPOTIFY_CLIENT_ID ?? '';
export const isSpotifyConfigured = Boolean(SPOTIFY_CLIENT_ID);

export const spotifyDiscovery = {
  authorizationEndpoint: 'https://accounts.spotify.com/authorize',
  tokenEndpoint: 'https://accounts.spotify.com/api/token',
};

export const SPOTIFY_SCOPES = ['user-read-currently-playing', 'user-read-recently-played', 'user-top-read'];

/** Add this exact value to the Spotify app's Redirect URIs: ev://spotify */
export const spotifyRedirectUri = AuthSession.makeRedirectUri({ scheme: 'ev', path: 'spotify' });

const TOKEN_KEY = 'spotify.tokens';
const SONG_KEY = 'spotify.songOfDay';

interface StoredTokens {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: number;
}

export interface SpotifyTrack {
  id: string;
  name: string;
  artist: string;
  albumArt: string | null;
  previewUrl: string | null;
  url: string;
}

export function loadTokens(): StoredTokens | null {
  const raw = Storage.getItemSync(TOKEN_KEY);
  return raw ? (JSON.parse(raw) as StoredTokens) : null;
}

export function saveTokens(t: { accessToken: string; refreshToken?: string | null; expiresIn?: number }): void {
  const stored: StoredTokens = {
    accessToken: t.accessToken,
    refreshToken: t.refreshToken ?? loadTokens()?.refreshToken ?? null,
    expiresAt: Date.now() + (t.expiresIn ?? 3600) * 1000,
  };
  Storage.setItemSync(TOKEN_KEY, JSON.stringify(stored));
}

export function clearSpotify(): void {
  Storage.removeItemSync(TOKEN_KEY);
}

export function isSpotifyConnected(): boolean {
  return loadTokens() != null;
}

async function getValidAccessToken(): Promise<string | null> {
  const tokens = loadTokens();
  if (!tokens) return null;
  if (Date.now() < tokens.expiresAt - 60_000) return tokens.accessToken;
  if (!tokens.refreshToken) return null;
  try {
    const res = await AuthSession.refreshAsync(
      { clientId: SPOTIFY_CLIENT_ID, refreshToken: tokens.refreshToken },
      spotifyDiscovery,
    );
    saveTokens({ accessToken: res.accessToken, refreshToken: res.refreshToken ?? tokens.refreshToken, expiresIn: res.expiresIn });
    return res.accessToken;
  } catch (e) {
    console.warn('ev: spotify refresh falhou', e);
    return null;
  }
}

async function api<T>(path: string): Promise<T | null> {
  const token = await getValidAccessToken();
  if (!token) return null;
  const res = await fetch(`https://api.spotify.com/v1${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 204) return null;
  if (!res.ok) {
    console.warn('ev: spotify api', res.status, path);
    return null;
  }
  return (await res.json()) as T;
}

interface RawArtist {
  name: string;
}
interface RawTrack {
  id: string;
  name: string;
  artists?: RawArtist[];
  album?: { images?: { url: string }[] };
  preview_url?: string | null;
  external_urls?: { spotify?: string };
}

function toTrack(t: RawTrack): SpotifyTrack {
  return {
    id: t.id,
    name: t.name,
    artist: (t.artists ?? []).map((a) => a.name).join(', '),
    albumArt: t.album?.images?.[0]?.url ?? null,
    previewUrl: t.preview_url ?? null,
    url: t.external_urls?.spotify ?? `https://open.spotify.com/track/${t.id}`,
  };
}

export async function searchTracks(query: string): Promise<SpotifyTrack[]> {
  if (!query.trim()) return [];
  const data = await api<{ tracks?: { items?: RawTrack[] } }>(
    `/search?type=track&limit=20&q=${encodeURIComponent(query)}`,
  );
  return (data?.tracks?.items ?? []).map(toTrack);
}

export async function getCurrentlyPlaying(): Promise<SpotifyTrack | null> {
  const data = await api<{ item?: RawTrack }>('/me/player/currently-playing');
  return data?.item ? toTrack(data.item) : null;
}

export function getSongOfDay(): SpotifyTrack | null {
  const raw = Storage.getItemSync(SONG_KEY);
  return raw ? (JSON.parse(raw) as SpotifyTrack) : null;
}

export function setSongOfDay(track: SpotifyTrack | null): void {
  if (track) Storage.setItemSync(SONG_KEY, JSON.stringify(track));
  else Storage.removeItemSync(SONG_KEY);
}
