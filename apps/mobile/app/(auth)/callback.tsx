// Auth callback handler for deep links (magic link + OAuth)
// Per AUTH_FLOWS.md PKCE exchange adapted for Expo deep links
import { View, Text, ActivityIndicator } from 'react-native';
import { useEffect, useState } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { supabase } from '@/lib/supabase';

export default function Callback() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // OAuth flow returns access_token and refresh_token in URL params
        const { access_token, refresh_token, type } = params;

        if (type === 'recovery') {
          setError('Password recovery not yet implemented');
          setTimeout(() => router.replace('/(auth)/login'), 2000);
          return;
        }

        // For OAuth, exchange tokens for session
        if (access_token && refresh_token) {
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: access_token as string,
            refresh_token: refresh_token as string,
          });

          if (sessionError) {
            console.error('[callback] Session error:', sessionError);
            setError(sessionError.message);
            setTimeout(() => router.replace('/(auth)/login'), 2000);
            return;
          }
        }

        // Magic link flow - session is already set via deep link
        // Just verify we have a session
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
          setError('No session found. Please try again.');
          setTimeout(() => router.replace('/(auth)/login'), 2000);
          return;
        }

        // Session established - root layout will handle redirect based on profile
        router.replace('/' as any);
      } catch (err) {
        console.error('[callback] Unexpected error:', err);
        setError('Something went wrong. Please try again.');
        setTimeout(() => router.replace('/(auth)/login'), 2000);
      }
    };

    handleCallback();
  }, [params, router]);

  if (error) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-950 p-6">
        <Text className="text-red-500 text-xl font-bold mb-4">Error</Text>
        <Text className="text-slate-400 text-center">{error}</Text>
        <Text className="text-slate-500 text-sm text-center mt-4">
          Redirecting to login...
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-1 items-center justify-center bg-slate-950">
      <ActivityIndicator size="large" color="#6366f1" />
      <Text className="text-slate-400 mt-4">Signing you in...</Text>
    </View>
  );
}
