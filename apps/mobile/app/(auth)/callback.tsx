import { Text } from '@/components/tw';
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

  const runCallback = useCallback(async (params: ReturnType<typeof parseAuthCallbackParams>) => {
    const { session, error: authError } = await completeAuthCallback(supabase, params);
    if (authError) {
      setError(authError);
      return;
    }
    if (!session) {
      setError('No session found. Please try again.');
      return;
    }
    router.replace(ROUTES.root as Href);
  }, [router]);

  useEffect(() => {
    if (handledRef.current) return;
    handledRef.current = true;
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
      }
    };
    void handleCallback();
  }, [runCallback, searchParams]);

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
