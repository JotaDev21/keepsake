import * as Location from 'expo-location';
import { Storage } from 'expo-sqlite/kv-store';

import type { IconName } from '@/components';

export interface Weather {
  tempC: number;
  description: string;
  icon: IconName;
}

interface CachedWeather {
  at: number;
  weather: Weather;
}

const CACHE_KEY = 'weatherCache';
const CACHE_TTL_MS = 30 * 60 * 1000;

/** Map a WMO weather code to a gentle PT description + a Feather icon. */
function describe(code: number): { description: string; icon: IconName } {
  if (code === 0) return { description: 'Céu limpo', icon: 'sun' };
  if (code <= 2) return { description: 'Sol entre nuvens', icon: 'cloud' };
  if (code === 3) return { description: 'Nublado', icon: 'cloud' };
  if (code === 45 || code === 48) return { description: 'Neblina', icon: 'cloud' };
  if (code >= 51 && code <= 67) return { description: 'Chuvisco', icon: 'cloud-drizzle' };
  if (code >= 71 && code <= 77) return { description: 'Neve', icon: 'cloud-snow' };
  if (code >= 80 && code <= 82) return { description: 'Pancadas de chuva', icon: 'cloud-rain' };
  if (code >= 95) return { description: 'Tempestade', icon: 'cloud-lightning' };
  return { description: 'Tempo ameno', icon: 'cloud' };
}

function readCache(): CachedWeather | null {
  try {
    const raw = Storage.getItemSync(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedWeather;
    if (typeof parsed.at !== 'number' || typeof parsed.weather?.tempC !== 'number') return null;
    return parsed;
  } catch {
    return null;
  }
}

/** Device position: last known fix first (instant), fresh GPS only as fallback. */
async function getPosition(): Promise<Location.LocationObject> {
  const known = await Location.getLastKnownPositionAsync();
  return known ?? Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low });
}

/**
 * Current weather at the device location (keyless via Open-Meteo). Null if unavailable.
 * Cached in the kv-store por 30 min; se a rede falhar, um cache vencido ainda
 * vale mais que nada.
 */
export async function getWeather(): Promise<Weather | null> {
  const cached = readCache();
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.weather;
  try {
    const perm = await Location.requestForegroundPermissionsAsync();
    if (!perm.granted) return cached?.weather ?? null;
    const { latitude, longitude } = (await getPosition()).coords;
    const res = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code`,
    );
    if (!res.ok) return cached?.weather ?? null;
    const data = (await res.json()) as { current?: { temperature_2m?: number; weather_code?: number } };
    const temp = data.current?.temperature_2m;
    if (temp == null) return cached?.weather ?? null;
    const { description, icon } = describe(data.current?.weather_code ?? 0);
    const weather: Weather = { tempC: Math.round(temp), description, icon };
    Storage.setItemSync(CACHE_KEY, JSON.stringify({ at: Date.now(), weather } satisfies CachedWeather));
    return weather;
  } catch (e) {
    console.warn('ev: clima falhou', e);
    return cached?.weather ?? null;
  }
}
