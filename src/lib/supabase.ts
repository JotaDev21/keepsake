import 'react-native-url-polyfill/auto';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { Storage } from 'expo-sqlite/kv-store';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(url && anonKey);

/** OS-protected auth storage with a one-time migration from older builds. */
const secureAuthStorage = {
  async getItem(key: string): Promise<string | null> {
    const protectedValue = await SecureStore.getItemAsync(key);
    if (protectedValue != null) return protectedValue;

    const legacyValue = Storage.getItemSync(key);
    if (legacyValue == null) return null;
    await SecureStore.setItemAsync(key, legacyValue);
    Storage.removeItemSync(key);
    return legacyValue;
  },
  async setItem(key: string, value: string): Promise<void> {
    await SecureStore.setItemAsync(key, value);
    Storage.removeItemSync(key);
  },
  async removeItem(key: string): Promise<void> {
    await SecureStore.deleteItemAsync(key);
    Storage.removeItemSync(key);
  },
};

/** Supabase is optional: without credentials, the app remains fully local. */
export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url as string, anonKey as string, {
      auth: {
        storage: secureAuthStorage,
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
      },
    })
  : null;
