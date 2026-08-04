import { startOfDay } from './mood';
import { Storage } from 'expo-sqlite/kv-store';
import type { MediaItem } from '@/types/models';

const DAY = 86400000;
const TODAY_MEMORY_KEY = 'memory.today';

/**
 * Pick the "memory of the day": prefer a media whose memory-date falls on today
 * (an anniversary, "há 1 ano"); otherwise a deterministic daily pick so it stays
 * the same all day and changes tomorrow.
 */
export function memoryOfDay(media: MediaItem[], now: Date = new Date()): MediaItem | null {
  if (media.length === 0) return null;

  const daySeed = Math.floor(startOfDay(now) / DAY);
  try {
    const raw = Storage.getItemSync(TODAY_MEMORY_KEY);
    const [cachedDay, cachedId] = raw?.split(':').map(Number) ?? [];
    if (cachedDay === daySeed) {
      const cached = media.find((item) => item.id === cachedId);
      if (cached) return cached;
    }
  } catch {
    // A cache miss only means recalculating the same quiet daily choice.
  }

  const anniversary = media.find((m) => {
    if (!m.dataMemoria) return false;
    const d = new Date(m.dataMemoria);
    return d.getMonth() === now.getMonth() && d.getDate() === now.getDate() && d.getFullYear() < now.getFullYear();
  });
  const selected = anniversary ?? media[daySeed % media.length];

  try {
    Storage.setItemSync(TODAY_MEMORY_KEY, `${daySeed}:${selected.id}`);
  } catch {
    // The gallery remains usable even if the tiny preference cache is unavailable.
  }
  return selected;
}
