// Full Supabase client with SecureStore adapter per STACK.md + AUTH_FLOWS.md adapted for Expo
// Context7 expo_dev 86.3 2026-05-28: SecureStore session persistence
import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import type { Database } from './database.types';

const supabaseUrl =
  Constants.expoConfig?.extra?.supabaseUrl;
const supabaseAnonKey =
  Constants.expoConfig?.extra?.supabaseAnonKey;

/** Hostnames that are placeholders — DNS fails and signInWithOtp throws "Failed to fetch". */
const INVALID_SUPABASE_HOSTS = new Set(['staging.supabase.co']);

export function getSupabaseConfigError(
  url: string | undefined = supabaseUrl,
  key: string | undefined = supabaseAnonKey
): string | null {
  if (!url?.trim() || !key?.trim()) {
    return (
      'Supabase is not configured. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY ' +
      'in apps/mobile/.env.local (see .env.example), then restart Expo.'
    );
  }
  let hostname: string;
  try {
    hostname = new URL(url).hostname;
  } catch {
    return `Invalid EXPO_PUBLIC_SUPABASE_URL: ${url}`;
  }
  if (
    INVALID_SUPABASE_HOSTS.has(hostname) ||
    url.includes('<project-ref>') ||
    key.includes('<anon')
  ) {
    return (
      `Invalid Supabase configuration (${hostname}). Use your real project URL, e.g. ` +
      'https://rwzzdsiawcovyfsnmiiy.supabase.co with the publishable/anon key from the Supabase dashboard.'
    );
  }
  if (!hostname.endsWith('.supabase.co')) {
    return `EXPO_PUBLIC_SUPABASE_URL must be a *.supabase.co project URL, not "${hostname}".`;
  }
  return null;
}

const supabaseConfigError = getSupabaseConfigError();
if (supabaseConfigError) {
  console.error('[supabase]', supabaseConfigError);
} else if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('[supabase] Missing EXPO_PUBLIC_SUPABASE_* in app.config extra (see .env.example)');
}

// Web-compatible storage adapter — localStorage on web, SecureStore on native
const WebStorageAdapter = {
  getItem: async (key: string): Promise<string | null> => {
    try { return localStorage.getItem(key); } catch { return null; }
  },
  setItem: async (key: string, value: string): Promise<void> => {
    try { localStorage.setItem(key, value); } catch {}
  },
  removeItem: async (key: string): Promise<void> => {
    try { localStorage.removeItem(key); } catch {}
  },
};

function getStorageAdapter() {
  if (Platform.OS === 'web') {
    return WebStorageAdapter;
  }
  return {
    getItem: SecureStore.getItemAsync,
    setItem: SecureStore.setItemAsync,
    removeItem: SecureStore.deleteItemAsync,
  };
}

export const supabase = createClient<Database>(
  supabaseUrl || '',
  supabaseAnonKey || '',
  {
    auth: {
      storage: getStorageAdapter(),
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: Platform.OS === 'web', // Web uses URL-based auth callbacks
    },
  }
);

// Auth state listener — stores/clears tokens in SecureStore on auth events
if (Platform.OS !== 'web') {
  supabase.auth.onAuthStateChange(async (event, session) => {
    if (event === 'SIGNED_IN' && session) {
      const { storeTokens } = require('@/lib/auth/token-refresh');
      await storeTokens(session.access_token, session.refresh_token);
    } else if (event === 'SIGNED_OUT') {
      const { clearTokens } = require('@/lib/auth/token-refresh');
      await clearTokens();
    } else if (event === 'TOKEN_REFRESHED' && session) {
      const { storeTokens } = require('@/lib/auth/token-refresh');
      await storeTokens(session.access_token, session.refresh_token);
    }
  });
}

export default supabase;
