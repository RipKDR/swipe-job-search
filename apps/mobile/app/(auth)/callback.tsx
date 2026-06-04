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
  const handledRef = useRef(false);
  const posthog = usePostHog();
  // OAuth (PKCE) callbacks carry a `code`; magic links carry tokens / `type`.
  const method = searchParams.code ? 'oauth' : 'magic_link';

  const runCallback = useCallback(async (params: ReturnType<typeof parseAuthCallbackParams>) => {
    const { session, error: authError } = await completeAuthCallback(supabase, params);
    if (authError) {
      setError(authError);
      posthog.capture('login_failed', { method, reason: 'callback_error' });
      return;
    }
    if (!session) {
      setError('No session found. Please try again.');
      posthog.capture('login_failed', { method, reason: 'no_session' });
      return;
    }
    posthog.capture('login_completed', { method });
    router.replace(ROUTES.root as Href);
  }, [router, posthog, method]);

  useEffect(() => {
    if (handledRef.current) return;
    const handleCallback = async () => {
      try {
        const initialUrl = await Linking.getInitialURL();
        if (initialUrl?.includes('auth/callback')) {
          await runCallback(parseAuthCallbackUrl(initialUrl));
          return;
        }
        await runCallback(parseAuthCallbackParams(searchParams));
      } catch (err) {
        console.error('[callback] Unexpected error:', err);
        setError('Something went wrong. Please try again.');
        posthog.capture('$exception', {
          $exception_message: getErrorMessage(err, 'auth callback error'),
          $exception_type: err instanceof Error ? err.name : 'UnknownError',
          context: 'auth_callback',
        });
        posthog.capture('login_failed', { method, reason: 'exception' });
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
          title="Sign in failed"
          description={error}
          secondary={
            <>
              <Button title="Try again" fullWidth onPress={() => router.replace(ROUTES.login as Href)} className="mb-3" />
              <Button title="Back to login" variant="outline" fullWidth onPress={() => router.replace(ROUTES.login as Href)} />
            </>
          }
        />
      </AppScreen>
    );
  }

  return <LoadingScreen message="Signing you in…" />;
}
