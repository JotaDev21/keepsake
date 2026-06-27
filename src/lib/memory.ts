import { startOfDay } from './mood';
import type { MediaItem } from '@/types/models';

const DAY = 86400000;

/**
 * Pick the "memory of the day": prefer a media whose memory-date falls on today
 * (an anniversary, "há 1 ano"); otherwise a deterministic daily pick so it stays
 * the same all day and changes tomorrow.
 */
export function memoryOfDay(media: MediaItem[], now: Date = new Date()): MediaItem | null {
  if (media.length === 0) return null;

  const anniversary = media.find((m) => {
    if (!m.dataMemoria) return false;
    const d = new Date(m.dataMemoria);
    return d.getMonth() === now.getMonth() && d.getDate() === now.getDate() && d.getFullYear() < now.getFullYear();
  });
  if (anniversary) return anniversary;

  const daySeed = Math.floor(startOfDay(now) / DAY);
  return media[daySeed % media.length];
}
