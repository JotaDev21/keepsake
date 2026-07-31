import * as AuthSession from 'expo-auth-session';
import * as SecureStore from 'expo-secure-store';
import { Storage } from 'expo-sqlite/kv-store';

export const SPOTIFY_CLIENT_ID = process.env.EXPO_PUBLIC_SPOTIFY_CLIENT_ID ?? '';
export const isSpotifyConfigured = Boolean(SPOTIFY_CLIENT_ID);

export const spotifyDiscovery = {
  authorizationEndpoint: 'https://accounts.spotify.com/authorize',
  tokenEndpoint: 'https://accounts.spotify.com/api/token',
};

export const SPOTIFY_SCOPES = ['user-read-currently-playing', 'user-read-recently-played', 'user-top-read'];

/** Spotify requires this exact HTTPS value in the app's Redirect URIs. */
export const SPOTIFY_REDIRECT_URI =
  'https://ziuktulqlfpmaruqabej.supabase.co/functions/v1/spotify-callback';

/** The HTTPS callback immediately hands the OAuth result back to this device. */
export const SPOTIFY_APP_RETURN_URI = AuthSession.makeRedirectUri({
  native: 'ev://spotify',
  scheme: 'ev',
  path: 'spotify',
});

const TOKEN_KEY = 'spotify.tokens';
const SECURE_TOKEN_KEY = 'spotify.tokens';
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

/**
 * Tokens live in the OS keystore (SecureStore), not the plain kv-store — they
 * grant access to the Spotify account. An in-memory cache keeps reads sync.
 * `undefined` = not hydrated yet.
 */
let tokenCache: StoredTokens | null | undefined;

export async function hydrateTokens(): Promise<void> {
  if (tokenCache !== undefined) return;
  try {
    // One-time migration from the old plain kv-store location.
    const legacy = Storage.getItemSync(TOKEN_KEY);
    if (legacy) {
      await SecureStore.setItemAsync(SECURE_TOKEN_KEY, legacy);
      Storage.removeItemSync(TOKEN_KEY);
    }
    const raw = await SecureStore.getItemAsync(SECURE_TOKEN_KEY);
    tokenCache = raw ? (JSON.parse(raw) as StoredTokens) : null;
  } catch (e) {
    console.warn('ev: spotify tokens indisponíveis', e);
    tokenCache = null;
  }
}

export function loadTokens(): StoredTokens | null {
  return tokenCache ?? null;
}

export function saveTokens(t: { accessToken: string; refreshToken?: string | null; expiresIn?: number }): void {
  const stored: StoredTokens = {
    accessToken: t.accessToken,
    refreshToken: t.refreshToken ?? loadTokens()?.refreshToken ?? null,
    expiresAt: Date.now() + (t.expiresIn ?? 3600) * 1000,
  };
  tokenCache = stored;
  SecureStore.setItemAsync(SECURE_TOKEN_KEY, JSON.stringify(stored)).catch((e) =>
    console.warn('ev: salvar tokens falhou', e),
  );
}

export function clearSpotify(): void {
  tokenCache = null;
  SecureStore.deleteItemAsync(SECURE_TOKEN_KEY).catch(() => {});
  Storage.removeItemSync(TOKEN_KEY);
}

export function isSpotifyConnected(): boolean {
  return loadTokens() != null;
}

async function getValidAccessToken(): Promise<string | null> {
  await hydrateTokens();
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
  try {
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
  } catch (e) {
    // Offline / flaky network must never become an unhandled rejection.
    console.warn('ev: spotify api falhou', e);
    return null;
  }
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

interface StoredSong {
  dia: number;
  track: SpotifyTrack;
}

function localStartOfDay(): number {
  const n = new Date();
  return new Date(n.getFullYear(), n.getMonth(), n.getDate()).getTime();
}

/** The song picked TODAY — yesterday's pick quietly steps aside at midnight. */
export function getSongOfDay(): SpotifyTrack | null {
  try {
    const raw = Storage.getItemSync(SONG_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredSong | SpotifyTrack;
    // Legacy shape (a bare track, no day) counts as stale.
    if (!('dia' in parsed) || !('track' in parsed)) return null;
    return parsed.dia === localStartOfDay() ? parsed.track : null;
  } catch {
    return null;
  }
}

export function setSongOfDay(track: SpotifyTrack | null): void {
  if (track) Storage.setItemSync(SONG_KEY, JSON.stringify({ dia: localStartOfDay(), track } satisfies StoredSong));
  else Storage.removeItemSync(SONG_KEY);
}
