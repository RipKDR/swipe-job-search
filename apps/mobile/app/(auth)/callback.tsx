import { View, Text } from 'react-native';
import { useEffect, useRef, useState } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { ROUTES, asRoute } from '@/lib/routing';
import { LoadingScreen } from '@/components/ui/LoadingScreen';

export default function Callback() {
  const router = useRouter();
  const { access_token, refresh_token, type } = useLocalSearchParams<{
    access_token?: string;
    refresh_token?: string;
    type?: string;
  }>();
  const [error, setError] = useState<string | null>(null);
  const handledRef = useRef(false);

  useEffect(() => {
    if (handledRef.current) return;
    handledRef.current = true;

    const handleCallback = async () => {
      try {
        if (type === 'recovery') {
          setError('Password recovery not yet implemented');
          setTimeout(() => router.replace(asRoute(ROUTES.login)), 2000);
          return;
        }

        if (access_token && refresh_token) {
          const { error: sessionError } = await supabase.auth.setSession({
            access_token,
            refresh_token,
          });

          if (sessionError) {
            console.error('[callback] Session error:', sessionError);
            setError(sessionError.message);
            setTimeout(() => router.replace(asRoute(ROUTES.login)), 2000);
            return;
          }
        }

        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
          setError('No session found. Please try again.');
          setTimeout(() => router.replace(asRoute(ROUTES.login)), 2000);
          return;
        }

        router.replace(asRoute(ROUTES.root));
      } catch (err) {
        console.error('[callback] Unexpected error:', err);
        setError('Something went wrong. Please try again.');
        setTimeout(() => router.replace(asRoute(ROUTES.login)), 2000);
      }
    };

    void handleCallback();
  }, [access_token, refresh_token, type, router]);

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

  return <LoadingScreen message="Signing you in..." />;
}
