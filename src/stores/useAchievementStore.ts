import type { RealtimeChannel } from '@supabase/supabase-js';
import { create } from 'zustand';
import { Storage } from 'expo-sqlite/kv-store';

import {
  type AchievementKey,
  type SharedAchievement,
  isAchievementKey,
} from '@/lib/achievements';
import { haptics } from '@/lib/haptics';
import { supabase } from '@/lib/supabase';

const PENDING_KEY = 'achievements.pending';

interface PendingAchievement {
  coupleId: string;
  uid: string;
  key: AchievementKey;
  metadata: Record<string, unknown>;
}

interface AchievementState {
  items: SharedAchievement[];
  loading: boolean;
  coupleId: string | null;
  uid: string | null;
  newlyUnlocked: AchievementKey | null;
  connect: (coupleId: string | null, uid: string | null) => Promise<void>;
  claim: (key: AchievementKey, metadata?: Record<string, unknown>) => Promise<boolean>;
  clearNew: () => void;
}

let channel: RealtimeChannel | null = null;

function readPending(): PendingAchievement[] {
  try {
    const raw = Storage.getItemSync(PENDING_KEY);
    return raw ? (JSON.parse(raw) as PendingAchievement[]) : [];
  } catch {
    return [];
  }
}

function writePending(items: PendingAchievement[]): void {
  try {
    Storage.setItemSync(PENDING_KEY, JSON.stringify(items));
  } catch {
    // The achievement already exists optimistically; a later visit can retry.
  }
}

function queue(item: PendingAchievement): void {
  writePending([...readPending().filter((entry) => entry.key !== item.key), item]);
}

function dequeue(key: AchievementKey): void {
  writePending(readPending().filter((entry) => entry.key !== key));
}

function mapRow(row: Record<string, unknown>): SharedAchievement | null {
  if (!isAchievementKey(row.key)) return null;
  return {
    key: row.key,
    unlockedBy: String(row.unlocked_by ?? ''),
    unlockedAt: Date.parse(String(row.unlocked_at ?? '')) || Date.now(),
    metadata:
      row.metadata && typeof row.metadata === 'object'
        ? (row.metadata as Record<string, unknown>)
        : {},
  };
}

async function fetchAchievements(coupleId: string): Promise<void> {
  if (!supabase) return;
  const { data, error } = await supabase
    .from('couple_achievements')
    .select('key,unlocked_by,unlocked_at,metadata')
    .eq('couple_id', coupleId)
    .order('unlocked_at', { ascending: true });
  if (error || !data) return;
  useAchievementStore.setState({
    items: data.map((row) => mapRow(row as Record<string, unknown>)).filter((row): row is SharedAchievement => row != null),
  });
}

async function send(item: PendingAchievement): Promise<boolean> {
  if (!supabase) return false;
  const { data, error } = await supabase.rpc('claim_couple_achievement', {
    p_key: item.key,
  });
  if (error || data !== true) return false;
  dequeue(item.key);
  return true;
}

async function flush(coupleId: string, uid: string): Promise<void> {
  const pending = readPending().filter((item) => item.coupleId === coupleId && item.uid === uid);
  for (const item of pending) {
    await send(item);
  }
  await fetchAchievements(coupleId);
}

function stopRealtime(): void {
  if (channel && supabase) supabase.removeChannel(channel).catch(() => {});
  channel = null;
}

export const useAchievementStore = create<AchievementState>((set, get) => ({
  items: [],
  loading: false,
  coupleId: null,
  uid: null,
  newlyUnlocked: null,

  connect: async (coupleId, uid) => {
    if (!coupleId || !uid || !supabase) {
      stopRealtime();
      set({ coupleId, uid, items: [], loading: false, newlyUnlocked: null });
      return;
    }

    const changed = get().coupleId !== coupleId || get().uid !== uid;
    if (changed) {
      stopRealtime();
      set({ coupleId, uid, items: [], loading: true, newlyUnlocked: null });
      channel = supabase
        .channel(`achievements:${coupleId}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'couple_achievements', filter: `couple_id=eq.${coupleId}` },
          (payload) => {
            const item = mapRow(payload.new as Record<string, unknown>);
            if (!item) return;
            const exists = useAchievementStore.getState().items.some((entry) => entry.key === item.key);
            if (!exists) {
              useAchievementStore.setState((state) => ({
                items: [...state.items, item],
                newlyUnlocked: item.unlockedBy === uid ? state.newlyUnlocked : item.key,
              }));
              if (item.unlockedBy !== uid) haptics.success();
            }
          },
        )
        .subscribe();
    }

    await fetchAchievements(coupleId);
    await flush(coupleId, uid);
    set({ loading: false });
  },

  claim: async (key, metadata = {}) => {
    const { coupleId, uid, items } = get();
    if (!coupleId || !uid) return false;
    if (items.some((item) => item.key === key)) return false;

    const pending: PendingAchievement = { coupleId, uid, key, metadata };
    queue(pending);
    set((state) => ({
      items: [
        ...state.items,
        { key, unlockedBy: uid, unlockedAt: Date.now(), metadata },
      ],
      newlyUnlocked: key,
    }));
    haptics.success();

    const synced = await send(pending);
    if (synced) await fetchAchievements(coupleId);
    return true;
  },

  clearNew: () => set({ newlyUnlocked: null }),
}));
