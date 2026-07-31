import { Storage } from 'expo-sqlite/kv-store';

import type { ThemeMode } from '@/design';

/** Fast local preferences (synchronous), backed by expo-sqlite's kv-store. */
const KEYS = {
  appLock: 'appLock',
  screenCaptureAllowed: 'screenCaptureAllowed',
  themeMode: 'themeMode',
  checkin: 'notifCheckin',
  checkinHour: 'notifCheckinHour',
  celebratedStage: 'gardenCelebratedStage',
  celebratedHydration: 'hydrationCelebratedDay',
  waterGoal: 'waterGoalMl',
  waterReminders: 'waterReminders',
  careSharing: 'careSharing',
} as const;

export const prefs = {
  isAppLockEnabled(): boolean {
    return Storage.getItemSync(KEYS.appLock) === '1';
  },
  setAppLockEnabled(enabled: boolean): void {
    Storage.setItemSync(KEYS.appLock, enabled ? '1' : '0');
  },

  /** Screenshots and screen recordings are blocked by default on each device. */
  isScreenCaptureAllowed(): boolean {
    return Storage.getItemSync(KEYS.screenCaptureAllowed) === '1';
  },
  setScreenCaptureAllowed(allowed: boolean): void {
    Storage.setItemSync(KEYS.screenCaptureAllowed, allowed ? '1' : '0');
  },

  /** The visual climate. Dark-first, so night is the default. */
  getThemeMode(): ThemeMode {
    return Storage.getItemSync(KEYS.themeMode) === 'dia' ? 'dia' : 'noite';
  },
  setThemeMode(mode: ThemeMode): void {
    Storage.setItemSync(KEYS.themeMode, mode);
  },

  /** The nightly check-in reminder. On by default, but theirs to turn off. */
  isCheckinEnabled(): boolean {
    return Storage.getItemSync(KEYS.checkin) !== '0';
  },
  setCheckinEnabled(enabled: boolean): void {
    Storage.setItemSync(KEYS.checkin, enabled ? '1' : '0');
  },
  getCheckinHour(): number {
    const raw = Storage.getItemSync(KEYS.checkinHour);
    if (raw == null) return 20;
    const h = Number(raw);
    return Number.isInteger(h) && h >= 0 && h <= 23 ? h : 20;
  },
  setCheckinHour(hour: number): void {
    Storage.setItemSync(KEYS.checkinHour, String(hour));
  },

  /** Which garden stage was already celebrated (the ritual fires once). */
  getCelebratedStage(): string | null {
    return Storage.getItemSync(KEYS.celebratedStage);
  },
  setCelebratedStage(key: string): void {
    Storage.setItemSync(KEYS.celebratedStage, key);
  },

  /** Day whose shared hydration completion already received its ritual. */
  getCelebratedHydrationDay(): string | null {
    return Storage.getItemSync(KEYS.celebratedHydration);
  },
  setCelebratedHydrationDay(day: string): void {
    Storage.setItemSync(KEYS.celebratedHydration, day);
  },

  /** Daily water goal in ml (default 2L). */
  getWaterGoalMl(): number {
    const raw = Storage.getItemSync(KEYS.waterGoal);
    if (raw == null) return 2000;
    const ml = Number(raw);
    return Number.isInteger(ml) && ml >= 500 && ml <= 6000 ? ml : 2000;
  },
  setWaterGoalMl(ml: number): void {
    Storage.setItemSync(KEYS.waterGoal, String(ml));
  },

  /** Gentle water reminders through the day. Off by default. */
  isWaterRemindersEnabled(): boolean {
    return Storage.getItemSync(KEYS.waterReminders) === '1';
  },
  setWaterRemindersEnabled(enabled: boolean): void {
    Storage.setItemSync(KEYS.waterReminders, enabled ? '1' : '0');
  },

  /** Shared self-care is explicit opt-in; local check-ins always keep working. */
  isCareSharingEnabled(): boolean {
    return Storage.getItemSync(KEYS.careSharing) === '1';
  },
  setCareSharingEnabled(enabled: boolean): void {
    Storage.setItemSync(KEYS.careSharing, enabled ? '1' : '0');
  },
};
