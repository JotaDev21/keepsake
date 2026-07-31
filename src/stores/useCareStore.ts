import { create } from 'zustand';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { Storage } from 'expo-sqlite/kv-store';

import { isCareKind, type CareKind, type CareSignal } from '@/lib/care';
import { haptics } from '@/lib/haptics';
import { startOfDay } from '@/lib/mood';
import { prefs } from '@/lib/prefs';
import { supabase } from '@/lib/supabase';

interface PendingCare {
  dia: number;
  kind: CareKind;
  completed: boolean;
  completedAt: number;
}

interface CareContext {
  coupleId: string | null;
  uid: string | null;
  partnerId: string | null;
}

interface CareState extends CareContext {
  mine: CareSignal[];
  partner: CareSignal[];
  hydrated: boolean;
  sharing: boolean;
  hydrate: () => void;
  connect: (coupleId: string | null, uid: string | null, partnerId: string | null) => Promise<void>;
  toggle: (kind: CareKind) => Promise<void>;
  setSharing: (enabled: boolean) => Promise<boolean>;
}

interface CareRow {
  author_id: string;
  kind: string;
  completed_at: string;
}

const LOCAL_PREFIX = 'care.local.';
const PENDING_KEY = 'care.pending';
const PURGE_KEY = 'care.purge';

let realtime: RealtimeChannel | null = null;

function localKey(dia = startOfDay()): string {
  return `${LOCAL_PREFIX}${dia}`;
}

function readMine(dia = startOfDay()): CareSignal[] {
  try {
    const raw = Storage.getItemSync(localKey(dia));
    if (!raw) return [];
    const value = JSON.parse(raw) as CareSignal[];
    return value.filter((signal) => isCareKind(signal.kind) && Number.isFinite(signal.completedAt));
  } catch {
    return [];
  }
}

function writeMine(signals: CareSignal[], dia = startOfDay()): void {
  Storage.setItemSync(localKey(dia), JSON.stringify(signals));
}

function readPending(): PendingCare[] {
  try {
    const raw = Storage.getItemSync(PENDING_KEY);
    if (!raw) return [];
    const value = JSON.parse(raw) as PendingCare[];
    return value.filter((item) => isCareKind(item.kind) && Number.isFinite(item.dia));
  } catch {
    return [];
  }
}

function queue(item: PendingCare): void {
  const next = readPending().filter(
    (pending) => !(pending.dia === item.dia && pending.kind === item.kind),
  );
  Storage.setItemSync(PENDING_KEY, JSON.stringify([...next, item]));
}

function dequeue(item: PendingCare): void {
  const next = readPending().filter(
    (pending) => !(pending.dia === item.dia && pending.kind === item.kind),
  );
  Storage.setItemSync(PENDING_KEY, JSON.stringify(next));
}

function stopRealtime(): void {
  if (realtime) {
    supabase?.removeChannel(realtime);
    realtime = null;
  }
}

async function pushOne(context: CareContext, item: PendingCare): Promise<boolean> {
  if (!supabase || !context.coupleId || !context.uid) return false;
  if (item.completed) {
    const { error } = await supabase.from('care_checkins').upsert(
      {
        couple_id: context.coupleId,
        author_id: context.uid,
        dia: item.dia,
        kind: item.kind,
        completed_at: new Date(item.completedAt).toISOString(),
      },
      { onConflict: 'author_id,dia,kind' },
    );
    return !error;
  }
  const { error } = await supabase
    .from('care_checkins')
    .delete()
    .eq('author_id', context.uid)
    .eq('dia', item.dia)
    .eq('kind', item.kind);
  return !error;
}

async function refreshRemote(): Promise<void> {
  const state = useCareStore.getState();
  if (!supabase || !state.coupleId || !state.uid) {
    useCareStore.setState({ partner: [] });
    return;
  }
  const { data, error } = await supabase
    .from('care_checkins')
    .select('author_id,kind,completed_at')
    .eq('couple_id', state.coupleId)
    .eq('dia', startOfDay());
  if (error || !data) return;
  const rows = data as CareRow[];
  const partner = rows.flatMap((row): CareSignal[] => {
    if (row.author_id === state.uid || !isCareKind(row.kind)) return [];
    return [{ kind: row.kind, completedAt: Date.parse(row.completed_at) || Date.now() }];
  });
  useCareStore.setState({ partner });
}

async function flush(): Promise<void> {
  const state = useCareStore.getState();
  if (!supabase || !state.coupleId || !state.uid) return;

  if (Storage.getItemSync(PURGE_KEY) === '1') {
    const { error } = await supabase.from('care_checkins').delete().eq('author_id', state.uid);
    if (error) return;
    Storage.removeItemSync(PURGE_KEY);
  }
  if (!state.sharing) return;

  for (const item of readPending()) {
    if (await pushOne(state, item)) dequeue(item);
  }

  // Local is the source of truth. Upsert today's checked signals after pending
  // deletes so an offline toggle sequence resolves to its final state.
  for (const signal of state.mine) {
    const item: PendingCare = {
      dia: startOfDay(),
      kind: signal.kind,
      completed: true,
      completedAt: signal.completedAt,
    };
    if (!(await pushOne(state, item))) queue(item);
  }
}

export const useCareStore = create<CareState>((set, get) => ({
  coupleId: null,
  uid: null,
  partnerId: null,
  mine: [],
  partner: [],
  hydrated: false,
  sharing: prefs.isCareSharingEnabled(),

  hydrate: () => {
    set({ mine: readMine(), hydrated: true, sharing: prefs.isCareSharingEnabled() });
  },

  connect: async (coupleId, uid, partnerId) => {
    stopRealtime();
    set({
      coupleId,
      uid,
      partnerId,
      mine: readMine(),
      partner: coupleId ? get().partner : [],
      hydrated: true,
      sharing: prefs.isCareSharingEnabled(),
    });
    if (!supabase || !coupleId || !uid) return;

    realtime = supabase
      .channel(`care:${coupleId}:${uid}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'care_checkins', filter: `couple_id=eq.${coupleId}` },
        () => void refreshRemote(),
      )
      .subscribe();
    await Promise.allSettled([refreshRemote(), flush()]);
  },

  toggle: async (kind) => {
    const dia = startOfDay();
    const current = get().mine;
    const completed = !current.some((signal) => signal.kind === kind);
    const completedAt = Date.now();
    const mine = completed
      ? [...current.filter((signal) => signal.kind !== kind), { kind, completedAt }]
      : current.filter((signal) => signal.kind !== kind);
    writeMine(mine, dia);
    set({ mine });
    haptics.tap();

    if (!get().sharing) return;
    const item: PendingCare = { dia, kind, completed, completedAt };
    if (!(await pushOne(get(), item))) queue(item);
  },

  setSharing: async (enabled) => {
    prefs.setCareSharingEnabled(enabled);
    set({ sharing: enabled });
    if (enabled) {
      await flush();
      await refreshRemote();
      return true;
    }

    Storage.setItemSync(PURGE_KEY, '1');
    const { uid } = get();
    if (!supabase || !uid) return true;
    const { error } = await supabase.from('care_checkins').delete().eq('author_id', uid);
    if (!error) Storage.removeItemSync(PURGE_KEY);
    return true;
  },
}));
