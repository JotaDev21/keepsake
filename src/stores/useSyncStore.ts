import { create } from 'zustand';
import type { RealtimeChannel } from '@supabase/supabase-js';

import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import type { MoodEntryDraft } from '@/types/models';

export type SyncStatus = 'unconfigured' | 'connecting' | 'ready' | 'error';

export interface PartnerMood {
  humor: string;
  intensidade: number;
  dia: number;
}

interface SyncState {
  status: SyncStatus;
  paired: boolean;
  inviteCode: string | null;
  partnerMood: PartnerMood | null;
  uid: string | null;
  coupleId: string | null;
  init: () => Promise<void>;
  createInvite: () => Promise<string | null>;
  joinWithCode: (code: string) => Promise<boolean>;
  pushMood: (draft: MoodEntryDraft) => Promise<void>;
  refreshPartner: () => Promise<void>;
}

let channel: RealtimeChannel | null = null;

function startRealtime(coupleId: string) {
  const sb = supabase;
  if (!sb) return;
  if (channel) {
    sb.removeChannel(channel);
    channel = null;
  }
  channel = sb
    .channel(`couple:${coupleId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'mood_entries', filter: `couple_id=eq.${coupleId}` },
      () => {
        useSyncStore.getState().refreshPartner();
      },
    )
    .subscribe();
}

export const useSyncStore = create<SyncState>((set, get) => ({
  status: 'connecting',
  paired: false,
  inviteCode: null,
  partnerMood: null,
  uid: null,
  coupleId: null,

  init: async () => {
    const sb = supabase;
    if (!sb || !isSupabaseConfigured) {
      set({ status: 'unconfigured' });
      return;
    }
    set({ status: 'connecting' });
    try {
      let session = (await sb.auth.getSession()).data.session;
      if (!session) {
        const { data, error } = await sb.auth.signInAnonymously();
        if (error) throw error;
        session = data.session;
      }
      const uid = session?.user.id ?? null;
      let coupleId: string | null = null;
      let inviteCode: string | null = null;

      if (uid) {
        const { data: member } = await sb.from('members').select('couple_id').eq('id', uid).maybeSingle();
        coupleId = (member?.couple_id as string | null) ?? null;
        if (coupleId) {
          const { data: couple } = await sb.from('couples').select('invite_code').eq('id', coupleId).maybeSingle();
          inviteCode = (couple?.invite_code as string | null) ?? null;
        }
      }

      set({ uid, coupleId, inviteCode, paired: !!coupleId, status: 'ready' });
      if (coupleId) {
        await get().refreshPartner();
        startRealtime(coupleId);
      }
    } catch (e) {
      console.warn('ev: sync init falhou', e);
      set({ status: 'error' });
    }
  },

  createInvite: async () => {
    const sb = supabase;
    const uid = get().uid;
    if (!sb || !uid) return null;
    const { data, error } = await sb.rpc('create_couple');
    if (error) {
      console.warn('ev: create_couple falhou', error);
      return null;
    }
    const code = data as string;
    const { data: member } = await sb.from('members').select('couple_id').eq('id', uid).maybeSingle();
    const coupleId = (member?.couple_id as string | null) ?? null;
    set({ inviteCode: code, coupleId, paired: !!coupleId });
    if (coupleId) {
      await get().refreshPartner();
      startRealtime(coupleId);
    }
    return code;
  },

  joinWithCode: async (code) => {
    const sb = supabase;
    const uid = get().uid;
    if (!sb || !uid) return false;
    const { data, error } = await sb.rpc('join_couple', { code: code.trim() });
    if (error) {
      console.warn('ev: join_couple falhou', error);
      return false;
    }
    const coupleId = data as string;
    const { data: couple } = await sb.from('couples').select('invite_code').eq('id', coupleId).maybeSingle();
    set({ coupleId, inviteCode: (couple?.invite_code as string | null) ?? code.trim().toUpperCase(), paired: true });
    await get().refreshPartner();
    startRealtime(coupleId);
    return true;
  },

  pushMood: async (draft) => {
    const sb = supabase;
    const { coupleId, uid } = get();
    if (!sb || !coupleId || !uid) return;
    const { error } = await sb.from('mood_entries').upsert(
      {
        couple_id: coupleId,
        author_id: uid,
        dia: draft.dia,
        humor: draft.humor,
        intensidade: draft.intensidade,
        nota: draft.nota,
        tags: draft.tags,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'author_id,dia' },
    );
    if (error) console.warn('ev: push mood falhou', error);
  },

  refreshPartner: async () => {
    const sb = supabase;
    const { coupleId, uid } = get();
    if (!sb || !coupleId || !uid) return;
    const { data } = await sb
      .from('mood_entries')
      .select('humor,intensidade,dia')
      .eq('couple_id', coupleId)
      .neq('author_id', uid)
      .order('dia', { ascending: false })
      .limit(1);
    const row = data?.[0];
    set({
      partnerMood: row
        ? { humor: row.humor as string, intensidade: row.intensidade as number, dia: row.dia as number }
        : null,
    });
  },
}));
