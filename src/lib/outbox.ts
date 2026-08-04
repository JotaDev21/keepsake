import { Storage } from 'expo-sqlite/kv-store';

/**
 * A tiny persistent queue for mirror pushes that failed (offline, server down).
 * Items are keyed so retries never duplicate: re-adding the same key replaces
 * the previous payload (e.g. today's mood saved twice offline pushes once).
 */
export type OutboxKind =
  | 'mood'
  | 'visit'
  | 'song'
  | 'water'
  | 'answer'
  | 'pulse'
  | 'pulse_response'
  | 'member_profile'
  | 'sharing_preference'
  | 'shared_dates'
  | 'shared_media'
  | 'letter'
  | 'letter_opened';

export interface OutboxItem {
  kind: OutboxKind;
  /** Stable identity, e.g. "mood:1780000000000" or "letter:12". */
  key: string;
  payload: unknown;
}

const KEY = 'sync.outbox';
let pendingListener: (() => void) | null = null;

function read(): OutboxItem[] {
  try {
    const raw = Storage.getItemSync(KEY);
    const parsed = raw ? (JSON.parse(raw) as OutboxItem[]) : [];
    // Early builds queued private journal content as an implicit cloud backup.
    // Never replay those legacy entries without an explicit backup feature.
    return parsed.filter(
      (item) => item.kind !== ('gratitude' as string) && item.kind !== ('reason' as string),
    );
  } catch {
    return [];
  }
}

function write(items: OutboxItem[]): void {
  try {
    Storage.setItemSync(KEY, JSON.stringify(items));
  } catch {
    // Losing the queue only delays a retry; never crash over it.
  }
}

export const outbox = {
  list(): OutboxItem[] {
    return read();
  },

  add(item: OutboxItem): void {
    write([...read().filter((i) => i.key !== item.key), item]);
    pendingListener?.();
  },

  /**
   * Remove only after a confirmed success — items must survive a process
   * death mid-flush, so the queue is never emptied ahead of the sends.
   */
  remove(key: string): void {
    write(read().filter((i) => i.key !== key));
  },

  /** Drop everything (leaving a couple — queued items no longer apply). */
  clear(): void {
    write([]);
  },

  /** Let the sync layer retry while the app remains open and the network returns. */
  onPending(listener: () => void): () => void {
    pendingListener = listener;
    return () => {
      if (pendingListener === listener) pendingListener = null;
    };
  },
};
