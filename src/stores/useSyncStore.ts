import { AppState } from 'react-native';
import { create } from 'zustand';
import type { RealtimeChannel } from '@supabase/supabase-js';
import * as Crypto from 'expo-crypto';
import { Storage } from 'expo-sqlite/kv-store';

import { letterRepo, mediaRepo, moodRepo, waterRepo } from '@/db/repositories';
import { haptics } from '@/lib/haptics';
import {
  removeMemberAvatar,
  signedMemberAvatar,
  uploadMemberAvatar,
  type MemberProfile,
} from '@/lib/member-profile';
import { deleteMedia, mediaExists, mediaUri } from '@/lib/media';
import { questionForDay } from '@/lib/questions';
import {
  clearSharedMediaCache,
  listSharedMedia,
  removeSharedMedia,
  sharedMediaError,
  uploadSharedMedia,
  type SharedMediaItem,
} from '@/lib/shared-media';
import {
  isRemotePushConfigured,
  notifyLetterArrived,
  presentNudge,
  presentPulse,
  presentPulseResponse,
  presentSharedMemory,
  syncReminders,
} from '@/lib/notifications';
import { outbox } from '@/lib/outbox';
import { prefs } from '@/lib/prefs';
import {
  isPulseKind,
  isPulseResponseKind,
  PULSE_TTL_MS,
  type PulseKind,
  type PulseResponse,
  type PulseResponseKind,
  type QuickPulse,
} from '@/lib/pulse';
import { startOfDay } from '@/lib/mood';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { getSongOfDay, type SpotifyTrack } from '@/lib/spotify';
import { useMediaStore } from '@/stores/useMediaStore';
import { usePersonStore } from '@/stores/usePersonStore';
import type { ImportantDateType, MoodEntryDraft } from '@/types/models';

export type SyncStatus = 'unconfigured' | 'connecting' | 'ready' | 'error';

export interface PartnerMood {
  humor: string;
  intensidade: number;
  dia: number;
}

export interface PartnerSong {
  dia: number;
  track: SpotifyTrack;
}

export interface PartnerWater {
  dia: number;
  ml: number;
  goalMl: number;
}

export interface PartnerAnswer {
  dia: number;
  resposta: string;
}

export type SharingPreferenceKey = 'mood' | 'water' | 'song' | 'dates';

export interface SharingPreferences {
  mood: boolean;
  water: boolean;
  song: boolean;
  dates: boolean;
}

export interface SharedDate {
  id: string;
  authorId: string;
  titulo: string;
  data: number;
  recorrente: boolean;
  tipo: ImportantDateType;
}

export interface ShareMediaResult {
  ok: boolean;
  message?: string;
}

const PRIVATE_BY_DEFAULT: SharingPreferences = {
  mood: false,
  water: false,
  song: false,
  dates: false,
};

/** What a nudge carries: a thought, care, or a gentle request to check in. */
export type NudgeKind = 'thinking' | 'agua' | 'checkin';

function nudgeKind(value: unknown): NudgeKind {
  return value === 'agua' || value === 'checkin' ? value : 'thinking';
}

interface SyncState {
  status: SyncStatus;
  /** Durable local changes still waiting for the server. */
  pendingChanges: number;
  /** In a couple (may still be waiting for the partner to join). */
  paired: boolean;
  /** The couple has both members — the app is truly "a dois". */
  partnerJoined: boolean;
  inviteCode: string | null;
  partnerMood: PartnerMood | null;
  /** Partner's garden days (start-of-day ms) — the shared sunflower. */
  partnerVisitDays: number[];
  partnerSong: PartnerSong | null;
  /** Partner's water today (live, from water_days). */
  partnerWater: PartnerWater | null;
  /** Partner's answer to today's question (revealed only after you answer). */
  partnerAnswer: PartnerAnswer | null;
  sharingPreferences: SharingPreferences;
  partnerDates: SharedDate[];
  sharedMedia: SharedMediaItem[];
  myProfile: MemberProfile | null;
  partnerProfile: MemberProfile | null;
  myPulse: QuickPulse | null;
  partnerPulse: QuickPulse | null;
  myPulseSeenAt: number | null;
  responseToMyPulse: PulseResponse | null;
  myResponseToPartnerPulse: PulseResponse | null;
  /** Today's shared question, when the couple has one on the server. */
  sharedQuestion: string | null;
  /** Day that `sharedQuestion` belongs to. Prevents yesterday leaking past midnight. */
  sharedQuestionDay: number | null;
  uid: string | null;
  coupleId: string | null;
  partnerId: string | null;
  /** Epoch ms of the last nudge received (persisted across launches). */
  lastNudgeAt: number | null;
  /** What the last nudge was — a thought or a water reminder. */
  lastNudgeKind: NudgeKind;
  /** Bumps whenever letters change from the outside (arrived / marked read). */
  lettersVersion: number;
  init: () => Promise<void>;
  /** Cheap catch-up when the app returns to the foreground. */
  onForeground: () => void;
  createInvite: () => Promise<string | null>;
  joinWithCode: (code: string) => Promise<'ok' | 'cheio' | 'expirado' | 'erro'>;
  /** Leave the couple on this device (server data stays). */
  unpair: () => Promise<boolean>;
  /**
   * Free the partner's seat (their phone was lost/replaced) so the new device
   * can join with a fresh, one-use invitation.
   */
  evictPartner: () => Promise<string | null>;
  pushMood: (draft: MoodEntryDraft) => Promise<void>;
  pushVisit: (dia: number) => Promise<void>;
  pushSong: (dia: number, track: SpotifyTrack | null) => Promise<void>;
  pushWater: (dia: number, ml: number, goalMl?: number) => Promise<void>;
  pushAnswer: (dia: number, resposta: string) => Promise<void>;
  pushPulse: (kind: PulseKind) => Promise<boolean>;
  respondToPulse: (kind: PulseResponseKind) => Promise<boolean>;
  acknowledgePartnerPulse: () => Promise<void>;
  saveMyProfile: (displayName: string, avatarFile?: string | null) => Promise<boolean>;
  setSharingPreference: (key: SharingPreferenceKey, enabled: boolean) => Promise<boolean>;
  syncSharedDates: () => Promise<void>;
  setMediaShared: (localId: number, shared: boolean) => Promise<ShareMediaResult>;
  refreshSharedMedia: () => Promise<void>;
  /**
   * Make sure today's deterministic shared question exists on the server.
   * Returns it, or null when
   * unpaired/offline (caller falls back to the local curated question).
   */
  ensureDailyQuestion: () => Promise<string | null>;
  pushLetter: (localId: number) => Promise<void>;
  pushLetterOpened: (remoteId: string) => Promise<void>;
  refreshPartner: () => Promise<void>;
  /** Send a nudge (a thought, or a water reminder) that survives the partner's app being closed. */
  sendNudge: (kind?: NudgeKind) => Promise<boolean>;
}

const CACHE = {
  coupleId: 'sync.coupleId',
  inviteCode: 'sync.inviteCode',
  partnerId: 'sync.partnerId',
  partnerJoined: 'sync.partnerJoined',
  lastNudgeAt: 'sync.lastNudgeAt',
  lastNudgeKind: 'sync.lastNudgeKind',
  myProfile: 'sync.myProfile',
  partnerProfile: 'sync.partnerProfile',
  identityAvatarFile: 'sync.identityAvatarFile',
  sharingPreferences: 'sync.sharingPreferences',
} as const;

function cached(key: string): string | null {
  try {
    return Storage.getItemSync(key);
  } catch {
    return null;
  }
}

function cache(key: string, value: string | null): void {
  try {
    if (value == null) Storage.removeItemSync(key);
    else Storage.setItemSync(key, value);
  } catch {
    // Cache misses only cost a softer cold start.
  }
}

function cachedProfile(key: string): MemberProfile | null {
  try {
    const raw = cached(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as MemberProfile;
    return {
      ...parsed,
      lastSeenAt: typeof parsed.lastSeenAt === 'number' ? parsed.lastSeenAt : null,
    };
  } catch {
    return null;
  }
}

function cacheProfile(key: string, profile: MemberProfile | null): void {
  cache(key, profile ? JSON.stringify(profile) : null);
}

function cachedSharingPreferences(): SharingPreferences {
  try {
    const raw = cached(CACHE.sharingPreferences);
    if (!raw) return { ...PRIVATE_BY_DEFAULT };
    const value = JSON.parse(raw) as Partial<SharingPreferences>;
    return {
      mood: value.mood === true,
      water: value.water === true,
      song: value.song === true,
      dates: value.dates === true,
    };
  } catch {
    return { ...PRIVATE_BY_DEFAULT };
  }
}

function cacheSharingPreferences(value: SharingPreferences): void {
  cache(CACHE.sharingPreferences, JSON.stringify(value));
}

function isMissingRpc(error: { code?: string; message?: string } | null): boolean {
  return Boolean(
    error &&
      (error.code === 'PGRST202' ||
        error.code === '42883' ||
        error.message?.includes('Could not find the function')),
  );
}

/** Supports the security migration and the previous schema during rollout. */
async function fetchActiveInvite(coupleId: string): Promise<string | null> {
  const sb = supabase;
  if (!sb) return null;
  const modern = await sb
    .from('couples')
    .select('invite_code,invite_active')
    .eq('id', coupleId)
    .maybeSingle();
  if (!modern.error) {
    return modern.data?.invite_active ? (modern.data.invite_code as string) : null;
  }

  // Old server, before 202607220001_two_person_security.sql is deployed.
  if (modern.error.code === '42703') {
    const legacy = await sb.from('couples').select('invite_code').eq('id', coupleId).maybeSingle();
    return (legacy.data?.invite_code as string | null) ?? null;
  }
  return null;
}

let channel: RealtimeChannel | null = null;
let channelHealthy = false;
let flushing = false;
let refreshInFlight: Promise<void> | null = null;
let refreshQueued = false;
let retryTimer: ReturnType<typeof setTimeout> | null = null;
let retryAttempt = 0;
// Single-flight guard: a foreground event during a slow first init must not
// spawn a second signInAnonymously (that would mint a duplicate identity).
let initing: Promise<void> | null = null;

function stopRealtime() {
  if (channel) {
    supabase?.removeChannel(channel);
    channel = null;
  }
  channelHealthy = false;
}

function clearSyncRetry(): void {
  if (retryTimer) clearTimeout(retryTimer);
  retryTimer = null;
  retryAttempt = 0;
}

/** Keep offline writes moving even when the app stays open as connectivity returns. */
function scheduleSyncRetry(): void {
  useSyncStore.setState({ pendingChanges: outbox.list().length });
  const state = useSyncStore.getState();
  if (retryTimer || (!state.coupleId && state.status !== 'error')) return;
  const delay = Math.min(60_000, 2_000 * 2 ** Math.min(retryAttempt, 5));
  retryTimer = setTimeout(() => {
    retryTimer = null;
    retryAttempt += 1;
    const latest = useSyncStore.getState();
    if (latest.status === 'error' || !latest.uid) void latest.init();
    else void refreshAll();
  }, delay);
}

// Every failed mirror write wakes the bounded retry loop. This also covers
// failures triggered while the app stays open (without a foreground event).
outbox.onPending(scheduleSyncRetry);

function startRealtime(coupleId: string) {
  const sb = supabase;
  if (!sb) return;
  stopRealtime();
  const store = () => useSyncStore.getState();
  channel = sb
    .channel(`couple:${coupleId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'mood_entries', filter: `couple_id=eq.${coupleId}` },
      () => void refreshPartnerMood(),
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'quick_pulses', filter: `couple_id=eq.${coupleId}` },
      (payload) => {
        const row = payload.new as { author_id?: string } | null;
        if (row?.author_id && row.author_id !== store().uid) {
          haptics.tap();
          if (AppState.currentState !== 'active' && !isRemotePushConfigured()) {
            presentPulse().catch(() => {});
          }
        }
        void refreshPulses();
      },
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'pulse_responses', filter: `couple_id=eq.${coupleId}` },
      (payload) => {
        const row = payload.new as { author_id?: string } | null;
        if (row?.author_id && row.author_id !== store().uid) {
          haptics.success();
          if (AppState.currentState !== 'active' && !isRemotePushConfigured()) {
            presentPulseResponse().catch(() => {});
          }
        }
        void refreshPulses();
      },
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'pulse_receipts', filter: `couple_id=eq.${coupleId}` },
      () => void refreshPulses(),
    )
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'nudges', filter: `couple_id=eq.${coupleId}` },
      (payload) => {
        const row = payload.new as { id: string; author_id: string; created_at: string; kind?: string };
        if (row.author_id === store().uid) return;
        const kind = nudgeKind(row.kind);
        // A thought (or a glass of water) arrived — a warm buzz, and a gentle
        // notification if the app isn't on screen.
        haptics.heavy();
        if (AppState.currentState !== 'active') presentNudge(kind).catch(() => {});
        setLastNudge(Date.parse(row.created_at) || Date.now(), kind);
        void markNudgesSeen([row.id]);
      },
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'water_days', filter: `couple_id=eq.${coupleId}` },
      (payload) => {
        const row = payload.new as { author_id?: string } | null;
        if (row?.author_id && row.author_id === store().uid) return;
        void refreshPartnerWater();
      },
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'question_answers', filter: `couple_id=eq.${coupleId}` },
      (payload) => {
        const row = payload.new as { author_id?: string } | null;
        if (row?.author_id && row.author_id === store().uid) return;
        // Her answer arrived — the reveal moment, if you've answered too.
        haptics.tap();
        void refreshPartnerAnswer();
      },
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'shared_letters', filter: `couple_id=eq.${coupleId}` },
      () => void importLetters(true),
    )
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'day_visits', filter: `couple_id=eq.${coupleId}` },
      (payload) => {
        const row = payload.new as { author_id: string };
        if (row.author_id === store().uid) return;
        // She just watered the garden — let it be felt, quietly.
        haptics.tap();
        void refreshPartnerVisits();
      },
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'songs', filter: `couple_id=eq.${coupleId}` },
      (payload) => {
        const row = payload.new as { author_id?: string } | null;
        if (row?.author_id && row.author_id === store().uid) return;
        void refreshPartnerSong();
      },
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'shared_dates', filter: `couple_id=eq.${coupleId}` },
      () => void refreshPartnerDates(),
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'shared_media', filter: `couple_id=eq.${coupleId}` },
      (payload) => {
        const row = payload.new as { author_id?: string } | null;
        if (payload.eventType === 'INSERT' && row?.author_id && row.author_id !== store().uid) {
          haptics.success();
          if (AppState.currentState !== 'active') presentSharedMemory().catch(() => {});
        }
        void refreshSharedMediaRemote();
      },
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'sharing_preferences', filter: `couple_id=eq.${coupleId}` },
      (payload) => {
        const row = payload.new as { user_id?: string } | null;
        if (row?.user_id === store().uid) void refreshSharingPreferences();
      },
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'members', filter: `couple_id=eq.${coupleId}` },
      () => void refreshAll(),
    )
    .subscribe((status) => {
      const wasHealthy = channelHealthy;
      channelHealthy = status === 'SUBSCRIBED';
      if (channelHealthy) {
        retryAttempt = 0;
        if (!wasHealthy) void refreshAll();
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
        scheduleSyncRetry();
      }
    });
}

function setLastNudge(at: number, kind: NudgeKind) {
  cache(CACHE.lastNudgeAt, String(at));
  cache(CACHE.lastNudgeKind, kind);
  useSyncStore.setState({ lastNudgeAt: at, lastNudgeKind: kind });
}

/* ------------------------------------------------ server refresh helpers */

/** Drop every trace of the couple on this device (state, caches, queue). */
function clearCoupleState(): void {
  const previousCoupleId = useSyncStore.getState().coupleId;
  stopRealtime();
  clearSyncRetry();
  if (previousCoupleId) clearSharedMediaCache(previousCoupleId);
  cache(CACHE.coupleId, null);
  cache(CACHE.inviteCode, null);
  cache(CACHE.partnerId, null);
  cache(CACHE.partnerJoined, null);
  cache(CACHE.lastNudgeAt, null);
  cache(CACHE.lastNudgeKind, null);
  cacheProfile(CACHE.myProfile, null);
  cacheProfile(CACHE.partnerProfile, null);
  cache(CACHE.sharingPreferences, null);
  outbox.clear();
  useSyncStore.setState({
    coupleId: null,
    inviteCode: null,
    paired: false,
    partnerJoined: false,
    partnerId: null,
    partnerMood: null,
    partnerVisitDays: [],
    partnerSong: null,
    partnerWater: null,
    partnerAnswer: null,
    sharingPreferences: { ...PRIVATE_BY_DEFAULT },
    partnerDates: [],
    sharedMedia: [],
    myProfile: null,
    partnerProfile: null,
    myPulse: null,
    partnerPulse: null,
    myPulseSeenAt: null,
    responseToMyPulse: null,
    myResponseToPartnerPulse: null,
    sharedQuestion: null,
    sharedQuestionDay: null,
    lastNudgeAt: null,
    pendingChanges: 0,
  });
}

async function refreshMembership(): Promise<void> {
  const sb = supabase;
  const { coupleId, uid, partnerJoined } = useSyncStore.getState();
  if (!sb || !coupleId || !uid) return;
  const { data, error } = await sb
    .from('members')
    .select('id,display_name,avatar_path,updated_at,last_seen_at')
    .eq('couple_id', coupleId);
  if (error || !data) return;
  // If our own row is gone from the couple, this device was evicted (partner
  // freed the seat for a new phone). Stop pushing into a couple we left.
  if (!data.some((m) => m.id === uid)) {
    clearCoupleState();
    return;
  }
  const partnerId = (data.find((m) => m.id !== uid)?.id as string | undefined) ?? null;
  const joined = data.length >= 2 && partnerId != null;
  const ownRow = data.find((member) => member.id === uid);
  const partnerRow = data.find((member) => member.id === partnerId);
  const toProfile = async (
    row: (typeof data)[number] | undefined,
    preferLocal: boolean,
  ): Promise<MemberProfile | null> => {
    if (!row) return null;
    const avatarPath = (row.avatar_path as string | null) ?? null;
    const cachedLocal = preferLocal ? cached(CACHE.identityAvatarFile) : null;
    const localFile = cachedLocal && mediaExists(cachedLocal) ? cachedLocal : null;
    const avatarUrl =
      localFile != null
        ? mediaUri(localFile)
        : await signedMemberAvatar(avatarPath);
    return {
      id: row.id as string,
      displayName: (row.display_name as string | null) ?? null,
      avatarPath,
      avatarUrl,
      updatedAt: Date.parse(row.updated_at as string) || Date.now(),
      lastSeenAt: Date.parse(row.last_seen_at as string) || null,
    };
  };
  const [myProfile, partnerProfile] = await Promise.all([
    toProfile(ownRow, true),
    toProfile(partnerRow, false),
  ]);
  const inviteCode = await fetchActiveInvite(coupleId);
  cache(CACHE.inviteCode, inviteCode);
  cache(CACHE.partnerId, partnerId);
  cache(CACHE.partnerJoined, joined ? '1' : '0');
  cacheProfile(CACHE.myProfile, myProfile);
  cacheProfile(CACHE.partnerProfile, partnerProfile);
  useSyncStore.setState({ partnerId, partnerJoined: joined, inviteCode, myProfile, partnerProfile });
  if (joined && !partnerJoined) {
    // She's here. The moment the app becomes "a dois".
    haptics.success();
  }
}

async function refreshPartnerMood(): Promise<void> {
  const sb = supabase;
  const { coupleId, partnerId } = useSyncStore.getState();
  if (!sb || !coupleId) return;
  if (!partnerId) {
    useSyncStore.setState({ partnerMood: null });
    return;
  }
  const { data, error } = await sb
    .from('mood_entries')
    .select('humor,intensidade,dia')
    .eq('couple_id', coupleId)
    .eq('author_id', partnerId)
    .order('dia', { ascending: false })
    .limit(1);
  // On a failed query keep what we already know — never blank her out.
  if (error || !data) return;
  const row = data[0];
  useSyncStore.setState({
    partnerMood: row
      ? { humor: row.humor as string, intensidade: row.intensidade as number, dia: row.dia as number }
      : null,
  });
}

async function refreshPulses(): Promise<void> {
  const sb = supabase;
  const { coupleId, uid, partnerId } = useSyncStore.getState();
  if (!sb || !coupleId || !uid) return;

  const { data, error } = await sb
    .from('quick_pulses')
    .select('id,author_id,kind,created_at,expires_at')
    .eq('couple_id', coupleId)
    .gt('expires_at', new Date().toISOString());
  if (error || !data) return;

  const fromRow = (row: (typeof data)[number] | undefined): QuickPulse | null => {
    if (!row || !isPulseKind(row.kind)) return null;
    return {
      id: row.id as string,
      kind: row.kind,
      createdAt: Date.parse(row.created_at as string),
      expiresAt: Date.parse(row.expires_at as string),
    };
  };

  const myPulse = fromRow(data.find((row) => row.author_id === uid));
  const partnerPulse = fromRow(data.find((row) => row.author_id === partnerId));
  const pulseIds = [myPulse?.id, partnerPulse?.id].filter((id): id is string => id != null);
  let responses: {
    id: string;
    pulse_id: string;
    author_id: string;
    kind: string;
    created_at: string;
  }[] = [];
  let receipts: { pulse_id: string; viewer_id: string; seen_at: string }[] = [];
  let responsesReady = pulseIds.length === 0;
  let receiptsReady = pulseIds.length === 0;
  if (pulseIds.length > 0) {
    const [responseResult, receiptResult] = await Promise.all([
      sb
        .from('pulse_responses')
        .select('id,pulse_id,author_id,kind,created_at')
        .in('pulse_id', pulseIds),
      sb.from('pulse_receipts').select('pulse_id,viewer_id,seen_at').in('pulse_id', pulseIds),
    ]);
    if (!responseResult.error && responseResult.data) {
      responses = responseResult.data;
      responsesReady = true;
    }
    if (!receiptResult.error && receiptResult.data) {
      receipts = receiptResult.data;
      receiptsReady = true;
    }
  }
  const toResponse = (
    row: (typeof responses)[number] | undefined,
  ): PulseResponse | null =>
    row && isPulseResponseKind(row.kind)
      ? {
          id: row.id,
          pulseId: row.pulse_id,
          kind: row.kind,
          createdAt: Date.parse(row.created_at),
        }
      : null;

  const previous = useSyncStore.getState();
  useSyncStore.setState({
    myPulse,
    partnerPulse,
    myPulseSeenAt: !receiptsReady && previous.myPulse?.id === myPulse?.id
      ? previous.myPulseSeenAt
      : myPulse
      ? Date.parse(
          receipts.find(
            (receipt) => receipt.pulse_id === myPulse.id && receipt.viewer_id === partnerId,
          )?.seen_at ?? '',
        ) || null
      : null,
    responseToMyPulse: !responsesReady && previous.myPulse?.id === myPulse?.id
      ? previous.responseToMyPulse
      : myPulse
      ? toResponse(
          responses.find(
            (response) => response.pulse_id === myPulse.id && response.author_id === partnerId,
          ),
        )
      : null,
    myResponseToPartnerPulse:
      !responsesReady && previous.partnerPulse?.id === partnerPulse?.id
        ? previous.myResponseToPartnerPulse
        : partnerPulse
      ? toResponse(
          responses.find(
            (response) => response.pulse_id === partnerPulse.id && response.author_id === uid,
          ),
        )
      : null,
  });
}

async function refreshPartnerVisits(): Promise<void> {
  const sb = supabase;
  const { coupleId, uid } = useSyncStore.getState();
  if (!sb || !coupleId || !uid) return;
  const { data, error } = await sb.from('day_visits').select('dia').eq('couple_id', coupleId).neq('author_id', uid);
  if (error || !data) return;
  useSyncStore.setState({ partnerVisitDays: data.map((r) => r.dia as number) });
}

async function refreshPartnerSong(): Promise<void> {
  const sb = supabase;
  const { coupleId, partnerId } = useSyncStore.getState();
  if (!sb || !coupleId || !partnerId) return;
  const { data, error } = await sb
    .from('songs')
    .select('dia,track')
    .eq('couple_id', coupleId)
    .eq('author_id', partnerId)
    .eq('dia', startOfDay())
    .limit(1);
  if (error || !data) return;
  const row = data[0];
  useSyncStore.setState({
    partnerSong: row ? { dia: row.dia as number, track: row.track as SpotifyTrack } : null,
  });
}

async function refreshPartnerWater(): Promise<void> {
  const sb = supabase;
  const { coupleId, partnerId } = useSyncStore.getState();
  if (!sb || !coupleId || !partnerId) return;
  const { data, error } = await sb
    .from('water_days')
    .select('dia,ml,goal_ml')
    .eq('couple_id', coupleId)
    .eq('author_id', partnerId)
    .eq('dia', startOfDay())
    .limit(1);
  if (error?.code === '42703') {
    // Older servers remain readable until the hydration migration lands.
    const legacy = await sb
      .from('water_days')
      .select('dia,ml')
      .eq('couple_id', coupleId)
      .eq('author_id', partnerId)
      .eq('dia', startOfDay())
      .limit(1);
    if (legacy.error || !legacy.data) return;
    const oldRow = legacy.data[0];
    useSyncStore.setState({
      partnerWater: oldRow
        ? { dia: oldRow.dia as number, ml: oldRow.ml as number, goalMl: 2000 }
        : null,
    });
    return;
  }
  if (error || !data) return;
  const row = data[0];
  useSyncStore.setState({
    partnerWater: row
      ? {
          dia: row.dia as number,
          ml: row.ml as number,
          goalMl: (row.goal_ml as number | null) ?? 2000,
        }
      : null,
  });
}

async function refreshPartnerAnswer(): Promise<void> {
  const sb = supabase;
  const { coupleId, partnerId } = useSyncStore.getState();
  if (!sb || !coupleId || !partnerId) return;
  const { data, error } = await sb
    .from('question_answers')
    .select('dia,resposta')
    .eq('couple_id', coupleId)
    .eq('author_id', partnerId)
    .eq('dia', startOfDay())
    .limit(1);
  if (error || !data) return;
  const row = data[0];
  useSyncStore.setState({
    partnerAnswer: row ? { dia: row.dia as number, resposta: row.resposta as string } : null,
  });
}

async function refreshSharingPreferences(): Promise<void> {
  const sb = supabase;
  const { uid, coupleId } = useSyncStore.getState();
  if (!sb || !uid || !coupleId) return;
  const { data, error } = await sb
    .from('sharing_preferences')
    .select('share_mood,share_water,share_song,share_dates')
    .eq('user_id', uid)
    .maybeSingle();
  if (error) return;
  const value: SharingPreferences = data
    ? {
        mood: data.share_mood === true,
        water: data.share_water === true,
        song: data.share_song === true,
        dates: data.share_dates === true,
      }
    : { ...PRIVATE_BY_DEFAULT };
  cacheSharingPreferences(value);
  useSyncStore.setState({ sharingPreferences: value });
}

async function refreshPartnerDates(): Promise<void> {
  const sb = supabase;
  const { coupleId, partnerId } = useSyncStore.getState();
  if (!sb || !coupleId || !partnerId) {
    useSyncStore.setState({ partnerDates: [] });
    return;
  }
  const { data, error } = await sb
    .from('shared_dates')
    .select('id,author_id,titulo,data,recorrente,tipo')
    .eq('couple_id', coupleId)
    .eq('author_id', partnerId);
  if (error || !data) return;
  useSyncStore.setState({
    partnerDates: data.map((row) => ({
      id: row.id as string,
      authorId: row.author_id as string,
      titulo: row.titulo as string,
      data: row.data as number,
      recorrente: row.recorrente as boolean,
      tipo:
        row.tipo === 'aniversario' || row.tipo === 'primeiro_encontro'
          ? row.tipo
          : 'outro',
    })),
  });
}

async function refreshSharedMediaRemote(): Promise<void> {
  const coupleId = useSyncStore.getState().coupleId;
  if (!coupleId) {
    useSyncStore.setState({ sharedMedia: [] });
    return;
  }
  const items = await listSharedMedia(coupleId);
  if (items) useSyncStore.setState({ sharedMedia: items });
}

async function fetchUnseenNudges(): Promise<void> {
  const sb = supabase;
  const { coupleId, uid } = useSyncStore.getState();
  if (!sb || !coupleId || !uid) return;
  const { data, error } = await sb
    .from('nudges')
    .select('id,created_at,kind')
    .eq('couple_id', coupleId)
    .neq('author_id', uid)
    .eq('seen', false)
    .order('created_at', { ascending: false });
  if (error || !data || data.length === 0) return;
  const latest = data[0];
  setLastNudge(
    Date.parse(latest.created_at as string) || Date.now(),
    nudgeKind(latest.kind),
  );
  void markNudgesSeen(data.map((r) => r.id as string));
}

async function markNudgesSeen(ids: string[]): Promise<void> {
  const sb = supabase;
  if (!sb || ids.length === 0) return;
  const { error } = await sb.rpc('mark_nudges_seen', { nudge_ids: ids });
  if (isMissingRpc(error)) await sb.from('nudges').update({ seen: true }).in('id', ids);
}

/** Pull letters the partner wrote (and read-receipts for ours) into SQLite. */
async function importLetters(viaRealtime: boolean): Promise<void> {
  const sb = supabase;
  const { coupleId, uid, partnerId } = useSyncStore.getState();
  const personId = usePersonStore.getState().person?.id;
  if (!sb || !coupleId || !uid || !personId) return;
  const { data, error } = await sb
    .from('shared_letters')
    .select('id,author_id,titulo,corpo,abrir_em,aberta,created_at')
    .eq('couple_id', coupleId);
  if (error || !data) return;

  try {
    const known = await letterRepo.listRemoteIds(personId);
    let changed = false;
    let arrived = false;
    for (const row of data) {
      if (row.author_id === uid) {
        if (row.aberta) changed = (await letterRepo.markLidaByRemote(row.id as string)) || changed;
      } else if (row.author_id === partnerId && !known.has(row.id as string)) {
        // Only the CURRENT partner's letters come in — after a reinstall, the
        // old ghost identity's letters are this person's own words, and a
        // sealed capsule written FOR the partner must never open here.
        const inserted = await letterRepo.insertReceived(personId, {
          remoteId: row.id as string,
          titulo: row.titulo as string,
          corpo: row.corpo as string,
          abrirEm: (row.abrir_em as number | null) ?? null,
          aberta: Boolean(row.aberta),
          criadoEm: Date.parse(row.created_at as string) || Date.now(),
        });
        if (inserted) {
          changed = true;
          arrived = true;
        }
      }
    }
    if (changed) useSyncStore.setState((s) => ({ lettersVersion: s.lettersVersion + 1 }));
    if (arrived) {
      // Received capsules get their opening reminder on THIS device too.
      syncReminders(personId).catch(() => {});
      if (viaRealtime) {
        haptics.success();
        if (AppState.currentState !== 'active') notifyLetterArrived().catch(() => {});
      }
    }
  } catch (e) {
    console.warn('ev: importar cartas falhou', e);
  }
}

async function refreshAll(): Promise<void> {
  if (refreshInFlight) {
    refreshQueued = true;
    return refreshInFlight;
  }
  const run = (async () => {
    // Membership must finish first: partner-scoped reads cannot race against
    // discovering a new/stale partner id on cold start.
    await refreshMembership();
    if (!useSyncStore.getState().coupleId) return;

    // Consent must be known before replaying queued mirrors; otherwise a cold
    // start could discard an allowed offline update using stale local defaults.
    await refreshSharingPreferences();
    await Promise.allSettled([
      refreshPartnerMood(),
      refreshPartnerVisits(),
      refreshPartnerSong(),
      refreshPartnerWater(),
      refreshPartnerAnswer(),
      refreshPartnerDates(),
      refreshSharedMediaRemote(),
      refreshPulses(),
      fetchUnseenNudges(),
      importLetters(false),
      flushOutbox(),
    ]);
  })();
  refreshInFlight = run.finally(() => {
    refreshInFlight = null;
    const pendingChanges = outbox.list().length;
    useSyncStore.setState({ pendingChanges });
    if (pendingChanges > 0 || !channelHealthy) scheduleSyncRetry();
    else clearSyncRetry();
    if (refreshQueued) {
      refreshQueued = false;
      void refreshAll();
    }
  });
  return refreshInFlight;
}

async function sendPulse(pulse: QuickPulse): Promise<boolean> {
  const sb = supabase;
  const key = 'pulse:current';
  const { coupleId, uid } = useSyncStore.getState();
  if (pulse.expiresAt <= Date.now()) {
    outbox.remove(key);
    return false;
  }
  if (!sb || !coupleId || !uid) {
    outbox.add({ kind: 'pulse', key, payload: pulse });
    return true;
  }

  try {
    const { data, error } = await sb.functions.invoke('pulse', {
      body: { id: pulse.id, kind: pulse.kind, createdAt: pulse.createdAt },
    });
    if (error || data?.ok !== true) {
      outbox.add({ kind: 'pulse', key, payload: pulse });
      return true;
    }
    outbox.remove(key);
    await refreshPulses();
    return true;
  } catch {
    outbox.add({ kind: 'pulse', key, payload: pulse });
    return true;
  }
}

async function sendPulseResponse(response: PulseResponse): Promise<boolean> {
  const sb = supabase;
  const key = `pulse-response:${response.pulseId}`;
  const { coupleId, uid } = useSyncStore.getState();
  if (!sb || !coupleId || !uid) {
    outbox.add({ kind: 'pulse_response', key, payload: response });
    return true;
  }

  try {
    const { data, error } = await sb.functions.invoke('pulse', {
      body: {
        action: 'respond',
        id: response.id,
        pulseId: response.pulseId,
        kind: response.kind,
        createdAt: response.createdAt,
      },
    });
    if (error || data?.ok !== true) {
      outbox.add({ kind: 'pulse_response', key, payload: response });
      return true;
    }
    outbox.remove(key);
    await refreshPulses();
    return true;
  } catch {
    outbox.add({ kind: 'pulse_response', key, payload: response });
    return true;
  }
}

interface MemberProfileDraft {
  displayName: string;
  avatarFile?: string | null;
}

async function saveMemberProfileRemote(draft: MemberProfileDraft): Promise<boolean> {
  const sb = supabase;
  const key = 'member-profile:current';
  const state = useSyncStore.getState();
  if (!sb || !state.uid || !state.coupleId) {
    outbox.add({ kind: 'member_profile', key, payload: draft });
    return true;
  }

  const previousRemote = state.myProfile?.avatarPath ?? null;
  let nextRemote = previousRemote;
  try {
    if (draft.avatarFile) {
      nextRemote = await uploadMemberAvatar(state.uid, mediaUri(draft.avatarFile));
    }
    const { data, error } = await sb.rpc('update_member_profile', {
      p_display_name: draft.displayName,
      p_avatar_path: nextRemote,
    });
    if (error || data !== true) throw error ?? new Error('perfil recusado');

    if (nextRemote && previousRemote && nextRemote !== previousRemote) {
      removeMemberAvatar(previousRemote).catch(() => {});
    }
    if (draft.avatarFile) {
      const previousLocal = cached(CACHE.identityAvatarFile);
      cache(CACHE.identityAvatarFile, draft.avatarFile);
      if (previousLocal && previousLocal !== draft.avatarFile) deleteMedia(previousLocal);
    }
    outbox.remove(key);
    await refreshMembership();
    return true;
  } catch (error) {
    if (nextRemote && nextRemote !== previousRemote) removeMemberAvatar(nextRemote).catch(() => {});
    console.warn('memory ev: perfil do membro aguardando conexão', error);
    outbox.add({ kind: 'member_profile', key, payload: draft });
    return true;
  }
}

async function flushOutbox(): Promise<void> {
  if (flushing) return;
  flushing = true;
  try {
    // Items stay in the persisted queue until their push confirms success —
    // a process death mid-flush must never lose them.
    const items = outbox.list();
    const s = useSyncStore.getState();
    for (const item of items) {
      // Each push removes its key on success and re-queues on failure.
      if (item.kind === 'mood') await s.pushMood(item.payload as MoodEntryDraft);
      else if (item.kind === 'visit') await s.pushVisit((item.payload as { dia: number }).dia);
      else if (item.kind === 'song') {
        const p = item.payload as { dia: number; track: SpotifyTrack | null };
        await s.pushSong(p.dia, p.track);
      } else if (item.kind === 'water') {
        const p = item.payload as { dia: number; ml: number; goalMl?: number };
        await s.pushWater(p.dia, p.ml, p.goalMl);
      } else if (item.kind === 'answer') {
        const p = item.payload as { dia: number; resposta: string };
        await s.pushAnswer(p.dia, p.resposta);
      } else if (item.kind === 'pulse') {
        const p = item.payload as QuickPulse;
        if (p.expiresAt <= Date.now()) outbox.remove(item.key);
        else await sendPulse(p);
      } else if (item.kind === 'pulse_response') {
        await sendPulseResponse(item.payload as PulseResponse);
      } else if (item.kind === 'member_profile') {
        await saveMemberProfileRemote(item.payload as MemberProfileDraft);
      } else if (item.kind === 'sharing_preference') {
        const p = item.payload as { key: SharingPreferenceKey; enabled: boolean };
        await s.setSharingPreference(p.key, p.enabled);
      } else if (item.kind === 'shared_dates') {
        await s.syncSharedDates();
      } else if (item.kind === 'shared_media') {
        const p = item.payload as { localId: number; shared: boolean };
        await s.setMediaShared(p.localId, p.shared);
      } else if (item.kind === 'letter') await s.pushLetter((item.payload as { localId: number }).localId);
      else if (item.kind === 'letter_opened') await s.pushLetterOpened((item.payload as { remoteId: string }).remoteId);
    }
  } finally {
    flushing = false;
  }
}

function touchLastSeen(): void {
  const sb = supabase;
  const { uid } = useSyncStore.getState();
  if (!sb || !uid) return;
  sb.rpc('touch_member').then(({ error }) => {
    if (isMissingRpc(error)) {
      sb.from('members').update({ last_seen_at: new Date().toISOString() }).eq('id', uid).then(() => {}, () => {});
    }
  }, () => {});
}

/* ------------------------------------------------------------------ store */

export const useSyncStore = create<SyncState>((set, get) => ({
  status: isSupabaseConfigured ? 'connecting' : 'unconfigured',
  pendingChanges: outbox.list().length,
  // Hydrate from cache so an offline cold start still knows the couple.
  paired: cached(CACHE.coupleId) != null,
  partnerJoined: cached(CACHE.partnerJoined) === '1',
  inviteCode: cached(CACHE.inviteCode),
  partnerMood: null,
  partnerVisitDays: [],
  partnerSong: null,
  partnerWater: null,
  partnerAnswer: null,
  sharingPreferences: cachedSharingPreferences(),
  partnerDates: [],
  sharedMedia: [],
  myProfile: cachedProfile(CACHE.myProfile),
  partnerProfile: cachedProfile(CACHE.partnerProfile),
  myPulse: null,
  partnerPulse: null,
  myPulseSeenAt: null,
  responseToMyPulse: null,
  myResponseToPartnerPulse: null,
  sharedQuestion: null,
  sharedQuestionDay: null,
  uid: null,
  coupleId: cached(CACHE.coupleId),
  partnerId: cached(CACHE.partnerId),
  lastNudgeAt: Number(cached(CACHE.lastNudgeAt)) || null,
  lastNudgeKind: nudgeKind(cached(CACHE.lastNudgeKind)),
  lettersVersion: 0,

  init: async () => {
    const sb = supabase;
    if (!sb || !isSupabaseConfigured) {
      set({ status: 'unconfigured' });
      return;
    }
    // Single-flight: a concurrent call (foreground during a slow first init)
    // awaits the one in progress instead of minting a second anonymous user.
    if (initing) return initing;
    const run = (async () => {
    set({ status: 'connecting' });
    try {
      let session = (await sb.auth.getSession()).data.session;
      if (!session) {
        const { data, error } = await sb.auth.signInAnonymously();
        if (error) throw error;
        session = data.session;
      }
      const uid = session?.user.id ?? null;
      if (!session || !uid) throw new Error('sem sessão');
      // On a brand-new anonymous session, Postgres Changes can subscribe
      // before the realtime client has copied the fresh JWT. Set it explicitly
      // so the partner's first event is not missed until a reconnect.
      await sb.realtime.setAuth(session.access_token);
      set({ uid });

      const { data: member, error: memberError } = await sb
        .from('members')
        .select('couple_id')
        .eq('id', uid)
        .maybeSingle();
      // A failed lookup is not "not paired" — keep the cached couple and retry later.
      if (memberError) throw memberError;

      const coupleId = (member?.couple_id as string | null) ?? null;
      let inviteCode: string | null = null;
      if (coupleId) {
        inviteCode = await fetchActiveInvite(coupleId);
      }

      cache(CACHE.coupleId, coupleId);
      cache(CACHE.inviteCode, inviteCode);
      if (!coupleId) {
        cache(CACHE.partnerId, null);
        cache(CACHE.partnerJoined, null);
        cache(CACHE.sharingPreferences, null);
      }
      set({
        coupleId,
        inviteCode,
        paired: !!coupleId,
        status: 'ready',
        ...(coupleId
          ? {}
          : {
              partnerJoined: false,
              partnerId: null,
              partnerMood: null,
              partnerVisitDays: [],
              partnerSong: null,
              sharingPreferences: { ...PRIVATE_BY_DEFAULT },
              partnerDates: [],
              sharedMedia: [],
              myProfile: null,
              partnerProfile: null,
              myPulse: null,
              partnerPulse: null,
              myPulseSeenAt: null,
              responseToMyPulse: null,
              myResponseToPartnerPulse: null,
              sharedQuestion: null,
              sharedQuestionDay: null,
            }),
      });

      if (coupleId) {
        touchLastSeen();
        startRealtime(coupleId);
        await refreshAll();
      }
    } catch (e) {
      console.warn('ev: sync init falhou', e);
      set({ status: 'error' });
      scheduleSyncRetry();
    }
    })();
    initing = run.finally(() => {
      initing = null;
    });
    return initing;
  },

  onForeground: () => {
    const { status, coupleId } = get();
    if (status === 'unconfigured') return;
    if (status === 'error' || status === 'connecting') {
      void get().init();
      return;
    }
    if (coupleId) {
      touchLastSeen();
      if (!channelHealthy) startRealtime(coupleId);
      void refreshAll();
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
    cache(CACHE.coupleId, coupleId);
    cache(CACHE.inviteCode, code);
    cache(CACHE.partnerJoined, '0');
    set({ inviteCode: code, coupleId, paired: !!coupleId, partnerJoined: false, partnerId: null });
    if (coupleId) {
      startRealtime(coupleId);
      await refreshAll();
    }
    return code;
  },

  joinWithCode: async (code) => {
    const sb = supabase;
    const uid = get().uid;
    if (!sb || !uid) return 'erro';
    const normalizedCode = code.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    const { data, error } = await sb.rpc('join_couple', { code: normalizedCode });
    if (error) {
      console.warn('ev: join_couple falhou', error);
      if (error.message?.includes('casal cheio')) return 'cheio';
      if (error.message?.includes('expirado')) return 'expirado';
      return 'erro';
    }
    const coupleId = data as string;
    const inviteCode = await fetchActiveInvite(coupleId);
    cache(CACHE.coupleId, coupleId);
    cache(CACHE.inviteCode, inviteCode);
    set({ coupleId, inviteCode, paired: true });
    startRealtime(coupleId);
    await refreshAll();
    return 'ok';
  },

  unpair: async () => {
    const sb = supabase;
    if (!sb) return false;
    const { error } = await sb.rpc('leave_couple');
    if (error) {
      console.warn('ev: leave_couple falhou', error);
      return false;
    }
    clearCoupleState();
    return true;
  },

  evictPartner: async () => {
    const sb = supabase;
    if (!sb) return null;
    const previousPartnerId = get().partnerId;
    const { data, error } = await sb.rpc('evict_partner');
    if (error) {
      console.warn('ev: evict_partner falhou', error);
      return null;
    }
    const inviteCode = typeof data === 'string' ? data : await fetchActiveInvite(get().coupleId ?? '');
    if (!inviteCode) return null;
    cache(CACHE.partnerId, null);
    cache(CACHE.partnerJoined, '0');
    cache(CACHE.inviteCode, inviteCode);
    set({
      partnerId: null,
      partnerJoined: false,
      inviteCode,
      partnerMood: null,
      partnerSong: null,
      partnerDates: [],
      sharedMedia: get().sharedMedia.filter((item) => item.authorId !== previousPartnerId),
      partnerProfile: null,
      partnerPulse: null,
      responseToMyPulse: null,
      myResponseToPartnerPulse: null,
    });
    return inviteCode;
  },

  pushMood: async (draft) => {
    const sb = supabase;
    const { coupleId, uid, sharingPreferences } = get();
    const key = `mood:${draft.dia}`;
    if (!sharingPreferences.mood) {
      outbox.remove(key);
      return;
    }
    if (!sb || !coupleId) return;
    // No session yet (init still failing offline) — hold it in the queue.
    if (!uid) {
      outbox.add({ kind: 'mood', key, payload: draft });
      return;
    }
    const { error } = await sb.from('mood_entries').upsert(
      {
        couple_id: coupleId,
        author_id: uid,
        dia: draft.dia,
        humor: draft.humor,
        intensidade: draft.intensidade,
        nota: null,
        tags: [],
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'author_id,dia' },
    );
    if (error) {
      console.warn('ev: push mood falhou', error);
      outbox.add({ kind: 'mood', key, payload: draft });
    } else {
      outbox.remove(key);
    }
  },

  pushPulse: async (kind) => {
    const { coupleId, uid, partnerJoined } = get();
    if (!coupleId || !partnerJoined) return false;

    const createdAt = Date.now();
    const pulse: QuickPulse = {
      id: Crypto.randomUUID(),
      kind,
      createdAt,
      expiresAt: createdAt + PULSE_TTL_MS,
    };
    set({ myPulse: pulse });

    if (!uid) {
      outbox.add({ kind: 'pulse', key: 'pulse:current', payload: pulse });
      return true;
    }
    return sendPulse(pulse);
  },

  respondToPulse: async (kind) => {
    const { partnerPulse, partnerJoined } = get();
    if (!partnerJoined || !partnerPulse || partnerPulse.expiresAt <= Date.now()) return false;
    const response: PulseResponse = {
      id: Crypto.randomUUID(),
      pulseId: partnerPulse.id,
      kind,
      createdAt: Date.now(),
    };
    set({ myResponseToPartnerPulse: response });
    haptics.success();
    return sendPulseResponse(response);
  },

  acknowledgePartnerPulse: async () => {
    const sb = supabase;
    const { partnerPulse } = get();
    if (!sb || !partnerPulse || partnerPulse.expiresAt <= Date.now()) return;
    await sb.rpc('see_quick_pulse', { p_pulse_id: partnerPulse.id });
  },

  saveMyProfile: async (displayName, avatarFile) => {
    const cleanName = displayName.trim().slice(0, 50);
    if (!cleanName) return false;
    const previous = get().myProfile;
    set({
      myProfile: {
        id: get().uid ?? previous?.id ?? 'local',
        displayName: cleanName,
        avatarPath: previous?.avatarPath ?? null,
        avatarUrl: avatarFile ? mediaUri(avatarFile) : (previous?.avatarUrl ?? null),
        updatedAt: Date.now(),
        lastSeenAt: previous?.lastSeenAt ?? Date.now(),
      },
    });
    cacheProfile(CACHE.myProfile, get().myProfile);
    return saveMemberProfileRemote({ displayName: cleanName, avatarFile });
  },

  setSharingPreference: async (key, enabled) => {
    const previous = get().sharingPreferences;
    const next = { ...previous, [key]: enabled };
    set({ sharingPreferences: next });
    cacheSharingPreferences(next);

    const queueKey = `sharing:${key}`;
    const sb = supabase;
    const { uid, coupleId } = get();
    if (!sb || !uid || !coupleId) {
      if (coupleId) {
        outbox.add({
          kind: 'sharing_preference',
          key: queueKey,
          payload: { key, enabled },
        });
        return true;
      }
      set({ sharingPreferences: previous });
      cacheSharingPreferences(previous);
      return false;
    }

    const { data, error } = await sb.rpc('set_sharing_preference', {
      p_key: key,
      p_enabled: enabled,
    });
    if (error || data !== true) {
      outbox.add({
        kind: 'sharing_preference',
        key: queueKey,
        payload: { key, enabled },
      });
      return true;
    }

    outbox.remove(queueKey);
    if (!enabled) {
      for (const item of outbox.list()) {
        if (item.kind === key || (key === 'dates' && item.kind === 'shared_dates')) {
          outbox.remove(item.key);
        }
      }
    } else {
      const personId = usePersonStore.getState().person?.id;
      if (key === 'dates') {
        await get().syncSharedDates();
      } else if (personId && key === 'mood') {
        const mood = await moodRepo.getByDay(personId, startOfDay());
        if (mood) {
          await get().pushMood({
            dia: mood.dia,
            humor: mood.humor,
            intensidade: mood.intensidade,
            nota: null,
            tags: [],
          });
        }
      } else if (personId && key === 'water') {
        await get().pushWater(
          startOfDay(),
          await waterRepo.get(personId, startOfDay()),
          prefs.getWaterGoalMl(),
        );
      } else if (key === 'song') {
        const song = getSongOfDay();
        if (song) await get().pushSong(startOfDay(), song);
      }
    }
    return true;
  },

  syncSharedDates: async () => {
    const { sharingPreferences, coupleId, uid } = get();
    const key = 'shared-dates:current';
    if (!sharingPreferences.dates) {
      outbox.remove(key);
      return;
    }
    if (!coupleId) return;
    if (!supabase || !uid) {
      outbox.add({ kind: 'shared_dates', key, payload: {} });
      return;
    }

    const dates = usePersonStore.getState().dates.map((date) => ({
      source_key: String(date.id),
      titulo: date.titulo,
      data: date.data,
      recorrente: date.recorrente,
      tipo: date.tipo,
    }));
    const { error } = await supabase.rpc('replace_my_shared_dates', { p_dates: dates });
    if (error) {
      outbox.add({ kind: 'shared_dates', key, payload: {} });
    } else {
      outbox.remove(key);
    }
  },

  setMediaShared: async (localId, shared) => {
    const item = await mediaRepo.getById(localId);
    if (!item) {
      outbox.remove(`shared-media:${localId}`);
      return { ok: false, message: 'Essa memória não foi encontrada.' };
    }
    const { uid, coupleId, partnerJoined } = get();
    if (!coupleId || !partnerJoined) {
      return { ok: false, message: 'Conecte os dois celulares antes de compartilhar.' };
    }

    const key = `shared-media:${localId}`;
    const remoteId = item.remoteId ?? Crypto.randomUUID();
    if (shared) {
      const validation = sharedMediaError(item);
      if (validation) return { ok: false, message: validation };
      await mediaRepo.setShared(localId, true, remoteId);
      useMediaStore.getState().updateSharing(localId, true, remoteId);
    } else {
      await mediaRepo.setShared(localId, false, remoteId);
      useMediaStore.getState().updateSharing(localId, false, remoteId);
    }

    if (!supabase || !uid) {
      outbox.add({ kind: 'shared_media', key, payload: { localId, shared } });
      return { ok: true, message: 'A mudança será concluída quando a conexão voltar.' };
    }

    try {
      if (shared) {
        await uploadSharedMedia(uid, coupleId, remoteId, item);
        await mediaRepo.setShared(localId, true, remoteId);
        useMediaStore.getState().updateSharing(localId, true, remoteId);
      } else if (item.remoteId) {
        await removeSharedMedia(item.remoteId);
        await mediaRepo.setShared(localId, false, null);
        useMediaStore.getState().updateSharing(localId, false, null);
      }
      outbox.remove(key);
      await refreshSharedMediaRemote();
      return { ok: true };
    } catch (error) {
      console.warn('memory ev: memória compartilhada aguardando conexão', error);
      outbox.add({ kind: 'shared_media', key, payload: { localId, shared } });
      return { ok: true, message: 'A mudança será concluída quando a conexão voltar.' };
    }
  },

  refreshSharedMedia: refreshSharedMediaRemote,

  pushVisit: async (dia) => {
    const sb = supabase;
    const { coupleId, uid } = get();
    const key = `visit:${dia}`;
    if (!sb || !coupleId) return;
    if (!uid) {
      outbox.add({ kind: 'visit', key, payload: { dia } });
      return;
    }
    const { error } = await sb
      .from('day_visits')
      .upsert({ couple_id: coupleId, author_id: uid, dia }, { onConflict: 'author_id,dia', ignoreDuplicates: true });
    if (error) outbox.add({ kind: 'visit', key, payload: { dia } });
    else outbox.remove(key);
  },

  pushSong: async (dia, track) => {
    const sb = supabase;
    const { coupleId, uid, sharingPreferences } = get();
    const key = `song:${dia}`;
    if (!sharingPreferences.song) {
      outbox.remove(key);
      return;
    }
    if (!sb || !coupleId) return;
    if (!uid) {
      outbox.add({ kind: 'song', key, payload: { dia, track } });
      return;
    }
    if (!track) {
      // Removal must survive being offline too — she'd keep seeing the song.
      const { error } = await sb.from('songs').delete().eq('author_id', uid).eq('dia', dia);
      if (error) outbox.add({ kind: 'song', key, payload: { dia, track: null } });
      else outbox.remove(key);
      return;
    }
    const { error } = await sb.from('songs').upsert(
      { couple_id: coupleId, author_id: uid, dia, track, updated_at: new Date().toISOString() },
      { onConflict: 'author_id,dia' },
    );
    if (error) outbox.add({ kind: 'song', key, payload: { dia, track } });
    else outbox.remove(key);
  },

  pushWater: async (dia, ml, goalMl = prefs.getWaterGoalMl()) => {
    const sb = supabase;
    const { coupleId, uid, sharingPreferences } = get();
    const key = `water:${dia}`;
    if (!sharingPreferences.water) {
      outbox.remove(key);
      return;
    }
    if (!sb || !coupleId) return;
    if (!uid) {
      outbox.add({ kind: 'water', key, payload: { dia, ml, goalMl } });
      return;
    }
    const { error } = await sb.from('water_days').upsert(
      {
        couple_id: coupleId,
        author_id: uid,
        dia,
        ml,
        goal_ml: goalMl,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'author_id,dia' },
    );
    if (error) {
      // Keep today's total working against a server that has not migrated yet.
      const legacy = await sb.from('water_days').upsert(
        { couple_id: coupleId, author_id: uid, dia, ml, updated_at: new Date().toISOString() },
        { onConflict: 'author_id,dia' },
      );
      if (legacy.error) outbox.add({ kind: 'water', key, payload: { dia, ml, goalMl } });
      else outbox.remove(key);
    } else {
      outbox.remove(key);
    }
  },

  pushAnswer: async (dia, resposta) => {
    const sb = supabase;
    const { coupleId, uid } = get();
    const key = `answer:${dia}`;
    if (!sb || !coupleId) return;
    if (!uid) {
      outbox.add({ kind: 'answer', key, payload: { dia, resposta } });
      return;
    }
    const { error } = await sb.from('question_answers').upsert(
      { couple_id: coupleId, author_id: uid, dia, resposta, updated_at: new Date().toISOString() },
      { onConflict: 'author_id,dia' },
    );
    if (error) {
      outbox.add({ kind: 'answer', key, payload: { dia, resposta } });
    } else {
      outbox.remove(key);
      // If she answered first, her row becomes readable only now that both
      // answers exist; the earlier realtime event was intentionally hidden.
      await refreshPartnerAnswer();
    }
  },

  ensureDailyQuestion: async () => {
    const sb = supabase;
    const { coupleId, uid, sharedQuestion, sharedQuestionDay } = get();
    const dia = startOfDay();
    if (!sb || !coupleId || !uid) return null;
    if (sharedQuestion && sharedQuestionDay === dia) return sharedQuestion;
    if (sharedQuestionDay !== dia) set({ sharedQuestion: null, sharedQuestionDay: dia });
    try {
      // Someone may have seeded it already (her device, or an earlier open).
      const { data } = await sb
        .from('daily_questions')
        .select('pergunta')
        .eq('couple_id', coupleId)
        .eq('dia', dia)
        .limit(1);
      const existing = (data?.[0]?.pergunta as string | undefined) ?? null;
      if (existing) {
        set({ sharedQuestion: existing, sharedQuestionDay: dia });
        return existing;
      }

      // This invariant must also hold when one phone opens offline: both sides
      // can derive exactly the same prompt without a server round-trip.
      const pergunta = questionForDay(dia);
      const { error } = await sb
        .from('daily_questions')
        .upsert({ couple_id: coupleId, dia, pergunta }, { onConflict: 'couple_id,dia', ignoreDuplicates: true });
      if (error) {
        console.warn('ev: semear pergunta falhou', error);
        return null;
      }
      // Re-read — if both devices raced, the winner's question is the truth.
      const { data: after } = await sb
        .from('daily_questions')
        .select('pergunta')
        .eq('couple_id', coupleId)
        .eq('dia', dia)
        .limit(1);
      const final = ((after?.[0]?.pergunta as string | undefined) ?? pergunta) || null;
      if (final) set({ sharedQuestion: final, sharedQuestionDay: dia });
      return final;
    } catch (e) {
      console.warn('ev: pergunta do dia falhou', e);
      return null;
    }
  },

  pushLetter: async (localId) => {
    const sb = supabase;
    const { coupleId, uid } = get();
    const key = `letter:${localId}`;
    if (!sb || !coupleId) return;
    if (!uid) {
      outbox.add({ kind: 'letter', key, payload: { localId } });
      return;
    }
    try {
      const letter = await letterRepo.getById(localId);
      if (!letter || letter.direcao !== 'minha') {
        outbox.remove(key);
        return;
      }
      // The id is minted on THIS device and the write is an idempotent upsert:
      // a retry after a lost response can never deliver the letter twice.
      let remoteId = letter.remoteId;
      if (!remoteId) {
        remoteId = Crypto.randomUUID();
        await letterRepo.setRemoteId(localId, remoteId);
      }
      const { error } = await sb.from('shared_letters').upsert(
        {
          id: remoteId,
          couple_id: coupleId,
          author_id: uid,
          titulo: letter.titulo,
          corpo: letter.corpo,
          abrir_em: letter.abrirEm,
          aberta: letter.aberta,
        },
        { onConflict: 'id', ignoreDuplicates: true },
      );
      if (error) outbox.add({ kind: 'letter', key, payload: { localId } });
      else outbox.remove(key);
    } catch (e) {
      console.warn('ev: enviar carta falhou', e);
      outbox.add({ kind: 'letter', key, payload: { localId } });
    }
  },

  pushLetterOpened: async (remoteId) => {
    const sb = supabase;
    const { coupleId } = get();
    const key = `letteropen:${remoteId}`;
    if (!sb || !coupleId) return;
    const { data, error } = await sb.rpc('open_shared_letter', { letter_id: remoteId });
    if (isMissingRpc(error)) {
      const legacy = await sb.from('shared_letters').update({ aberta: true }).eq('id', remoteId);
      if (legacy.error) outbox.add({ kind: 'letter_opened', key, payload: { remoteId } });
      else outbox.remove(key);
    } else if (error || data !== true) {
      outbox.add({ kind: 'letter_opened', key, payload: { remoteId } });
    } else {
      outbox.remove(key);
    }
  },

  refreshPartner: async () => {
    await Promise.allSettled([refreshPartnerMood(), refreshPulses()]);
  },

  sendNudge: async (kind: NudgeKind = 'thinking') => {
    const sb = supabase;
    const { coupleId, uid, partnerJoined } = get();
    if (!sb || !coupleId || !uid || !partnerJoined) return false;
    const id = Crypto.randomUUID();
    try {
      const { data, error } = await sb.functions.invoke('pulse', {
        body: { action: 'nudge', id, kind },
      });
      if (!error && data?.ok === true) return true;

      // Older edge deployment or a lost function response: the durable row is
      // still the source of truth and realtime/foreground catch-up will find it.
      const fallback = await sb.from('nudges').upsert(
        { id, couple_id: coupleId, author_id: uid, kind },
        { onConflict: 'id', ignoreDuplicates: true },
      );
      if (!fallback.error) return true;
      console.warn('ev: nudge falhou', error ?? fallback.error);
      return false;
    } catch (e) {
      console.warn('ev: nudge falhou', e);
      return false;
    }
  },
}));
