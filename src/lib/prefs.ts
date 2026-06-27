import { Storage } from 'expo-sqlite/kv-store';

/** Fast local preferences (synchronous), backed by expo-sqlite's kv-store. */
const KEYS = {
  appLock: 'appLock',
} as const;

export const prefs = {
  isAppLockEnabled(): boolean {
    return Storage.getItemSync(KEYS.appLock) === '1';
  },
  setAppLockEnabled(enabled: boolean): void {
    Storage.setItemSync(KEYS.appLock, enabled ? '1' : '0');
  },
};
