/** Minimal Supabase AuthError shape from @supabase/supabase-js */
export type SupabaseAuthErrorLike = {
  message?: string;
  status?: number;
  code?: string;
  name?: string;
};

const REDIRECT_HINT =
  'Add this exact callback URL in Supabase Dashboard → Authentication → URL Configuration → Redirect URLs. ' +
  'Also set Site URL to your app origin (e.g. http://localhost:8081 for Expo web).';

/**
 * Turn Supabase Auth errors into actionable copy for the login UI.
 * Logs the raw message separately in login.tsx for debugging.
 */
export function formatSupabaseAuthError(
  error: SupabaseAuthErrorLike,
  context?: { redirectUrl?: string },
): string {
  const message = error.message?.trim() || 'Something went wrong. Please try again.';
  const lower = message.toLowerCase();
  const code = error.code ?? '';

  if (
    error.status === 400 &&
    (lower.includes('redirect') ||
      lower.includes('allow list') ||
      lower.includes('allowed') ||
      code === 'bad_oauth_callback' ||
      code === 'unexpected_failure')
  ) {
    const redirect = context?.redirectUrl;
    return redirect
      ? `${message} (${redirect}). ${REDIRECT_HINT}`
      : `${message} ${REDIRECT_HINT}`;
  }

  if (error.status === 400 && (lower.includes('invalid format') || lower.includes('validate email'))) {
    return 'Enter a valid email address and try again.';
  }

  if (
    error.status === 400 &&
    (lower.includes('signup') || lower.includes('sign up') || lower.includes('not enabled'))
  ) {
    return `${message} Check Supabase Dashboard → Authentication → Providers → Email is enabled.`;
  }

  if (error.status === 400 && code === 'validation_failed') {
    return message;
  }

  return message;
}
