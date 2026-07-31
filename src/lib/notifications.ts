import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';

import { dateRepo, letterRepo } from '@/db/repositories';
import { supabase } from './supabase';
import { nextOccurrence } from './dates';
import { prefs } from './prefs';

const CHANNEL = 'lembretes';
const SIGNALS_CHANNEL = 'sinais';

export function isRemotePushConfigured(): boolean {
  return Boolean(
    Constants.easConfig?.projectId ??
      (Constants.expoConfig?.extra?.eas as { projectId?: string } | undefined)?.projectId,
  );
}

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

/**
 * All copy below is deliberately discreet: notifications sit on the lock
 * screen, so they never carry names, letter titles or anything intimate.
 * The `data.url` routes a tap to the right ritual inside the app.
 */

/** Show an immediate, gentle nudge notification (a thought, water, or check-in). */
export async function presentNudge(kind: 'thinking' | 'agua' | 'checkin' = 'thinking'): Promise<void> {
  try {
    const allowed = await ensureNotifications();
    if (!allowed) return;
    const body =
      kind === 'agua'
        ? 'Um lembrete carinhoso: água. 💧'
        : kind === 'checkin'
          ? 'Como você está? Tem um pedido gentil de check-in. 🌻'
          : 'Alguém pensou em você. 🌻';
    await Notifications.scheduleNotificationAsync({
      content: { title: 'memory ev', body, data: { url: kind === 'checkin' ? '/humor' : '/' } },
      trigger: null,
    });
  } catch {
    // A missed nudge must never crash.
  }
}

/** Realtime fallback while the app process is alive but behind another app. */
export async function presentPulse(): Promise<void> {
  try {
    const allowed = await ensureNotifications();
    if (!allowed) return;
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'memory ev',
        body: 'Tem um novo sinal esperando por você.',
        data: { url: '/', type: 'pulse' },
      },
      trigger: null,
    });
  } catch {
    // Realtime still updates the card when the app returns.
  }
}

export async function presentPulseResponse(): Promise<void> {
  try {
    const allowed = await ensureNotifications();
    if (!allowed) return;
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'memory ev',
        body: 'Tem uma resposta esperando por você.',
        data: { url: '/', type: 'pulse_response' },
      },
      trigger: null,
    });
  } catch {
    // The response remains waiting in the shared card.
  }
}

/** Realtime fallback while the app process is alive in the background. */
export async function presentSharedMemory(): Promise<void> {
  try {
    const allowed = await ensureNotifications();
    if (!allowed) return;
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'memory ev',
        body: 'Uma memória nova chegou para vocês.',
        data: { url: '/memorias-compartilhadas', type: 'shared_media' },
      },
      trigger: null,
    });
  } catch {
    // The shared gallery catches up when the app returns.
  }
}

/** A letter from the partner just arrived on this device. */
export async function notifyLetterArrived(): Promise<void> {
  try {
    const allowed = await ensureNotifications();
    if (!allowed) return;
    await Notifications.scheduleNotificationAsync({
      content: { title: 'memory ev', body: 'Chegou uma carta pra você.', data: { url: '/cartas' } },
      trigger: null,
    });
  } catch {
    // Silence over crash.
  }
}

/** Ensure the channel + permission. Returns whether notifications are allowed. */
export async function ensureNotifications(): Promise<boolean> {
  if (Platform.OS === 'android') {
    await Promise.all([
      Notifications.setNotificationChannelAsync(CHANNEL, {
        name: 'Lembretes',
        importance: Notifications.AndroidImportance.DEFAULT,
      }),
      Notifications.setNotificationChannelAsync(SIGNALS_CHANNEL, {
        name: 'Sinais do casal',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 180, 120, 180],
      }),
    ]);
  }
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const req = await Notifications.requestPermissionsAsync();
  return req.granted;
}

/**
 * Registers this physical device for private partner pushes. This is best
 * effort: local-first use remains intact when EAS or notification permission
 * is unavailable.
 */
export async function registerRemoteNotifications(): Promise<boolean> {
  if (!Device.isDevice || !supabase || (Platform.OS !== 'android' && Platform.OS !== 'ios')) {
    return false;
  }

  try {
    const allowed = await ensureNotifications();
    if (!allowed) return false;

    const projectId =
      Constants.easConfig?.projectId ??
      (Constants.expoConfig?.extra?.eas as { projectId?: string } | undefined)?.projectId;
    if (!projectId) {
      console.info('memory ev: push remoto aguarda vínculo com um projeto Expo/EAS');
      return false;
    }

    const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
    const { data, error } = await supabase.rpc('register_push_token', {
      p_token: token,
      p_platform: Platform.OS,
    });
    if (error || data !== true) {
      console.warn('memory ev: registro de push falhou', error);
      return false;
    }
    return true;
  } catch (error) {
    console.warn('memory ev: push remoto indisponível', error);
    return false;
  }
}

/**
 * Rebuild all local reminders from current data: a gentle daily check-in, the
 * upcoming important dates, and any capsule about to open. Cancels everything
 * first so it stays in sync (single source of truth).
 */
export async function syncReminders(personId: number): Promise<void> {
  const allowed = await ensureNotifications();
  if (!allowed) return;

  await Notifications.cancelAllScheduledNotificationsAsync();

  // Daily check-in, at the hour they chose (or not at all).
  if (prefs.isCheckinEnabled()) {
    await Notifications.scheduleNotificationAsync({
      content: { title: 'memory ev', body: 'Como foi o dia?', data: { url: '/humor' } },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: prefs.getCheckinHour(),
        minute: 0,
        channelId: CHANNEL,
      },
    });
  }

  // Gentle water reminders through the day (opt-in).
  if (prefs.isWaterRemindersEnabled()) {
    for (const hour of [10, 13, 16, 19]) {
      await Notifications.scheduleNotificationAsync({
        content: { title: 'memory ev', body: 'Um gole de água? 💧', data: { url: '/' } },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour,
          minute: 0,
          channelId: CHANNEL,
        },
      });
    }
  }

  // Important dates at 09:00 on their next occurrence (no title on lock screen).
  const dates = await dateRepo.listByPerson(personId);
  for (const d of dates) {
    const occ = nextOccurrence(d.data, d.recorrente);
    const when = new Date(occ.getFullYear(), occ.getMonth(), occ.getDate(), 9, 0, 0);
    if (when.getTime() > Date.now()) {
      await Notifications.scheduleNotificationAsync({
        content: { title: 'memory ev', body: 'Hoje é um dia especial de vocês. 🌻', data: { url: '/' } },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: when, channelId: CHANNEL },
      });
    }
  }

  // Capsules opening in the future — written here or received from her.
  const letters = await letterRepo.listByPerson(personId);
  for (const l of letters) {
    if (l.abrirEm && !l.aberta && l.abrirEm > Date.now()) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'memory ev',
          body: 'Uma cápsula está pronta pra abrir.',
          data: { url: `/carta/${l.id}` },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: new Date(l.abrirEm),
          channelId: CHANNEL,
        },
      });
    }
  }
}
