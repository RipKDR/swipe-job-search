// Full Supabase client with SecureStore adapter per STACK.md + AUTH_FLOWS.md adapted for Expo
// Context7 expo_dev 86.3 2026-05-28: SecureStore session persistence
import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import type { Database } from '@hi-hired/shared';

const supabaseUrl = Constants.expoConfig?.extra?.supabaseUrl;
const supabaseAnonKey = Constants.expoConfig?.extra?.supabaseAnonKey;

if (!supabaseUrl || !supabaseAnonKey) {
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
  // Lazy import SecureStore on native only
  const SecureStore = require('expo-secure-store');
  return {
    getItem: async (key: string): Promise<string | null> => SecureStore.getItemAsync(key),
    setItem: async (key: string, value: string): Promise<void> => SecureStore.setItemAsync(key, value),
    removeItem: async (key: string): Promise<void> => SecureStore.deleteItemAsync(key),
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

export default supabase;
