import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

import { dateRepo, letterRepo } from '@/db/repositories';
import { nextOccurrence } from './dates';

const CHANNEL = 'lembretes';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

/** Ensure the channel + permission. Returns whether notifications are allowed. */
export async function ensureNotifications(): Promise<boolean> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL, {
      name: 'Lembretes',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const req = await Notifications.requestPermissionsAsync();
  return req.granted;
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

  // Daily mood check-in at 20:00.
  await Notifications.scheduleNotificationAsync({
    content: { title: 'memory ev', body: 'Como você está hoje?' },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour: 20, minute: 0, channelId: CHANNEL },
  });

  // Important dates at 09:00 on their next occurrence.
  const dates = await dateRepo.listByPerson(personId);
  for (const d of dates) {
    const occ = nextOccurrence(d.data, d.recorrente);
    const when = new Date(occ.getFullYear(), occ.getMonth(), occ.getDate(), 9, 0, 0);
    if (when.getTime() > Date.now()) {
      await Notifications.scheduleNotificationAsync({
        content: { title: d.titulo, body: 'Uma data importante chegou.' },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: when, channelId: CHANNEL },
      });
    }
  }

  // Capsules opening in the future.
  const letters = await letterRepo.listByPerson(personId);
  for (const l of letters) {
    if (l.abrirEm && !l.aberta && l.abrirEm > Date.now()) {
      await Notifications.scheduleNotificationAsync({
        content: { title: 'Uma cápsula abriu', body: l.titulo },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: new Date(l.abrirEm),
          channelId: CHANNEL,
        },
      });
    }
  }
}
