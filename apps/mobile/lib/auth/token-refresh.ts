/**
 * Token Auto-Refresh — Secure token storage and refresh utilities.
 *
 * Stores access and refresh tokens in Expo SecureStore for
 * persistent auth sessions across app restarts.
 */

import * as SecureStore from 'expo-secure-store';
import { supabase } from '@/lib/supabase';

const ACCESS_TOKEN_KEY = 'hi_hired_access_token';
const REFRESH_TOKEN_KEY = 'hi_hired_refresh_token';

/**
 * Store both access and refresh tokens in SecureStore.
 */
export async function storeTokens(
  accessToken: string,
  refreshToken: string,
): Promise<void> {
  await Promise.all([
    SecureStore.setItemAsync(ACCESS_TOKEN_KEY, accessToken),
    SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken),
  ]);
}

/**
 * Clear both tokens from SecureStore (used on sign-out).
 */
export async function clearTokens(): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY),
    SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
  ]);
}

/**
 * Refresh the access token using Supabase's refreshSession.
 *
 * Returns the new access token string, or null if refresh failed.
 */
export async function refreshAccessToken(
  refreshToken?: string,
): Promise<string | null> {
  try {
    const { data, error } = await supabase.auth.refreshSession(
      refreshToken ? { refresh_token: refreshToken } : undefined,
    );

    if (error || !data.session) {
      console.warn('[token-refresh] refresh failed:', error?.message);
      return null;
    }

    // Store the new tokens
    await storeTokens(
      data.session.access_token,
      data.session.refresh_token,
    );

    return data.session.access_token;
  } catch (e: any) {
    console.warn('[token-refresh] refresh error:', e?.message);
    return null;
  }
}

/**
 * Get the current access token from SecureStore.
 */
export async function getAccessToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
  } catch {
    return null;
  }
}

/**
 * Get the current refresh token from SecureStore.
 */
export async function getRefreshToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
  } catch {
    return null;
  }
}
