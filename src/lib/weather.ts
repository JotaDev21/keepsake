import * as Location from 'expo-location';

import type { IconName } from '@/components';

export interface Weather {
  tempC: number;
  description: string;
  icon: IconName;
}

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

/** Current weather at the device location (keyless via Open-Meteo). Null if unavailable. */
export async function getWeather(): Promise<Weather | null> {
  try {
    const perm = await Location.requestForegroundPermissionsAsync();
    if (!perm.granted) return null;
    const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low });
    const { latitude, longitude } = loc.coords;
    const res = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code`,
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { current?: { temperature_2m?: number; weather_code?: number } };
    const temp = data.current?.temperature_2m;
    if (temp == null) return null;
    const { description, icon } = describe(data.current?.weather_code ?? 0);
    return { tempC: Math.round(temp), description, icon };
  } catch (e) {
    console.warn('ev: clima falhou', e);
    return null;
  }
}
