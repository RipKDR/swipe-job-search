// Tests for Supabase client configuration - simplified for U3
// Note: Full integration tests require native Expo environment

import { describe, it, expect, vi } from 'vitest';

// Mock expo modules before imports
vi.mock('expo-secure-store', () => ({
  getItemAsync: vi.fn(),
  setItemAsync: vi.fn(),
  deleteItemAsync: vi.fn(),
}));

vi.mock('expo-constants', () => ({
  default: {
    expoConfig: {
      extra: {
        supabaseUrl: 'https://test.supabase.co',
        supabaseAnonKey: 'test-anon-key',
      },
    },
  },
}));

vi.mock('react-native-url-polyfill/auto', () => ({}));

describe('Supabase client configuration', () => {
  it('should export supabase client', async () => {
    const { supabase } = await import('../supabase');
    expect(supabase).toBeDefined();
  });

  it('should configure client with auth storage', async () => {
    const { supabase } = await import('../supabase');
    expect(supabase.auth).toBeDefined();
  });

  it('should have session management methods', async () => {
    const { supabase } = await import('../supabase');
    expect(supabase.auth.getSession).toBeDefined();
    expect(supabase.auth.onAuthStateChange).toBeDefined();
  });
});
