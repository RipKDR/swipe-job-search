/**
 * OAuth2 Authentication — Google and Apple sign-in via Supabase + expo-web-browser.
 *
 * Uses Expo's WebBrowser for a secure OAuth redirect flow and
 * Linking.createURL for the callback URL.
 */

import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { supabase } from '@/lib/supabase';

export type OAuthProvider = 'google' | 'apple';

export interface OAuthResult {
  error: string | null;
}

/**
 * Sign in with OAuth provider (Google or Apple).
 *
 * Opens a secure browser session for OAuth, listens for the
 * deep-link callback, and signs in via Supabase.
 *
 * Returns `{ error: null }` on success, or `{ error: 'message' }` on failure.
 */
export async function signInWithOAuth(
  provider: OAuthProvider,
): Promise<OAuthResult> {
  try {
    const redirectUrl = Linking.createURL('auth/callback');

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: redirectUrl,
        skipBrowserRedirect: true,
      },
    });

    if (error) {
      return { error: error.message };
    }

    if (!data.url) {
      return { error: 'No OAuth URL returned from Supabase.' };
    }

    // Open the OAuth URL in a secure browser session
    const result = await WebBrowser.openAuthSessionAsync(
      data.url,
      redirectUrl,
    );

    if (result.type === 'success' && result.url) {
      // The URL contains the auth code — Supabase handles the exchange
      // via the URL hash/query params when the app re-opens.
      return { error: null };
    }

    if (result.type === 'cancel') {
      return { error: 'Sign in was cancelled.' };
    }

    return { error: 'OAuth session failed.' };
  } catch (e: any) {
    return { error: e?.message ?? 'Unknown OAuth error.' };
  }
}
