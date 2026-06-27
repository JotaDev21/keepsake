import 'react-native-url-polyfill/auto';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { Storage } from 'expo-sqlite/kv-store';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

/** Whether sync credentials are present (app still works fully offline without them). */
export const isSupabaseConfigured = Boolean(url && anonKey);

/**
 * The Supabase client, or null when not configured. Auth session is persisted
 * in the local kv-store (expo-sqlite). The anon key is public by design — data
 * is protected by Row Level Security on the server.
 */
export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url as string, anonKey as string, {
      auth: {
        storage: Storage,
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
      },
    })
  : null;
