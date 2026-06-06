import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter, useLocalSearchParams, type Href } from 'expo-router';
import * as Linking from 'expo-linking';
import { supabase } from '@/lib/supabase';
import {
  completeAuthCallback,
  parseAuthCallbackParams,
  parseAuthCallbackUrl,
} from '@/lib/authCallback';
import { ROUTES } from '@/lib/routing';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { AppScreen } from '@/components/ui/AppScreen';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import { usePostHog } from '@/hooks/usePostHog';
import { getErrorMessage } from '@/lib/errors';

/**
 * Auth callback screen.
 *
 * Handles:
 * - OAuth (PKCE) callbacks via OAuth `code` parameter
 * - Magic-link callbacks via `access_token` + `refresh_token` tokens
 * - OAuth cancellation (error=access_denied or error=user_cancelled)
 * - General error states from the auth provider
 * - Error states from the callback exchange itself
 */
export default function Callback() {
  const router = useRouter();
  const searchParams = useLocalSearchParams<{
    access_token?: string;
    refresh_token?: string;
    code?: string;
    error?: string;
    error_description?: string;
    type?: string;
  }>();
  const [error, setError] = useState<string | null>(null);
  const [errorTitle, setErrorTitle] = useState<string | null>(null);
  const handledRef = useRef(false);
  const posthog = usePostHog();

  // OAuth (PKCE) callbacks carry a `code`; magic links carry tokens / `type`.
  const method = searchParams.code ? 'oauth' : 'magic_link';

  const runCallback = useCallback(
    async (params: ReturnType<typeof parseAuthCallbackParams>) => {
      // ── Handle explicit OAuth errors (cancellation, provider errors) ──
      if (params.error) {
        const description =
          params.error_description ?? params.error ?? 'Unknown error';

        if (
          params.error === 'access_denied' ||
          params.error === 'user_cancelled' ||
          params.error === 'cancelled'
        ) {
          setErrorTitle('Sign in cancelled');
          setError(
            params.error_description || 'You cancelled the sign-in process.',
          );
          posthog.capture('login_failed', {
            method,
            reason: 'cancelled',
            error: params.error,
          });
          return;
        }

        setErrorTitle('Sign in failed');
        setError(description);
        posthog.capture('login_failed', {
          method,
          reason: 'provider_error',
          error: params.error,
        });
        return;
      }

      // ── No tokens or code → this might be a stale / direct visit ──
      if (!params.code && !params.access_token && !params.refresh_token) {
        // If already signed in, redirect to home
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (session) {
          setError(null);
          router.replace(ROUTES.root as Href);
          return;
        }
        // Otherwise show a helpful message
        setErrorTitle('No sign-in data');
        setError(
          'No sign-in information was received. This may happen if you opened this link directly.',
        );
        posthog.capture('login_failed', {
          method,
          reason: 'no_params',
        });
        return;
      }

      // ── Exchange the auth code or tokens for a session ──
      const { session, error: authError } = await completeAuthCallback(
        supabase,
        params,
      );

      if (authError) {
        setErrorTitle('Sign in failed');
        setError(authError);
        posthog.capture('login_failed', {
          method,
          reason: 'callback_error',
          error: authError,
        });
        return;
      }

      if (!session) {
        setErrorTitle('No session');
        setError('No session found. Please try again.');
        posthog.capture('login_failed', {
          method,
          reason: 'no_session',
        });
        return;
      }

      posthog.capture('login_completed', { method });
      router.replace(ROUTES.root as Href);
    },
    [router, posthog, method],
  );

  useEffect(() => {
    if (handledRef.current) return;

    const handleCallback = async () => {
      try {
        // Check for a deep-link URL first (handles cold-start links)
        const initialUrl = await Linking.getInitialURL();
        if (initialUrl?.includes('auth/callback')) {
          await runCallback(parseAuthCallbackUrl(initialUrl));
          return;
        }

        await runCallback(parseAuthCallbackParams(searchParams));
      } catch (err) {
        console.error('[callback] Unexpected error:', err);
        setErrorTitle('Something went wrong');
        setError('An unexpected error occurred. Please try signing in again.');
        posthog.capture('$exception', {
          $exception_message: getErrorMessage(err, 'auth callback error'),
          $exception_type: err instanceof Error ? err.name : 'UnknownError',
          context: 'auth_callback',
        });
        posthog.capture('login_failed', {
          method,
          reason: 'exception',
        });
      } finally {
        handledRef.current = true;
      }
    };

    void handleCallback();
  }, [runCallback, searchParams, posthog, method]);

  if (error) {
    return (
      <AppScreen centered maxWidth="md">
        <EmptyState
          emoji="🔐"
          title={errorTitle ?? 'Sign in failed'}
          description={error}
          secondary={
            <>
              <Button
                title="Try again"
                fullWidth
                onPress={() => router.replace(ROUTES.login as Href)}
                className="mb-3"
              />
              <Button
                title="Back to login"
                variant="outline"
                fullWidth
                onPress={() => router.replace(ROUTES.login as Href)}
              />
            </>
          }
        />
      </AppScreen>
    );
  }

  return <LoadingScreen message="Signing you in…" />;
}
