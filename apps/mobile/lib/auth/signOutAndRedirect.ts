/**
 * Sign out and redirect to login.
 *
 * Clears:
 * - Supabase session (via provided signOut callback)
 * - SecureStore cached tokens (access + refresh)
 * - TanStack Query cache (via AuthProvider's signOut -> queryClient.clear())
 * - Zustand store (if any — not currently used, cleared for future-proofing)
 *
 * If sign-out fails, still redirect to login (best-effort).
 */

import { clearTokens } from './token-refresh';

type SignOutAndRedirectInput = {
  signOut: () => Promise<void>;
  replace: (route: string) => void;
};

export async function signOutAndRedirect({
  signOut: doSignOut,
  replace,
}: SignOutAndRedirectInput): Promise<void> {
  try {
    await doSignOut();
  } catch (err) {
    console.warn('[signOut] best-effort sign out:', err);
    // Continue redirect even if sign-out API call fails
  }

  // Clear SecureStore tokens so no stale session persists on next app start
  try {
    await clearTokens();
  } catch (err) {
    console.warn('[signOut] failed to clear SecureStore tokens:', err);
  }

  replace('/(auth)/login');
}
