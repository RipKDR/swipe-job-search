type SignOutAndRedirectInput = {
  signOut: () => Promise<void>;
  replace: (route: string) => void;
};

/**
 * Sign out and redirect to login.
 * If sign-out fails, still redirect to login (best-effort).
 * Cached query data is cleared by AuthProvider's signOut callback via queryClient.clear().
 */
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
  replace('/(auth)/login');
}
