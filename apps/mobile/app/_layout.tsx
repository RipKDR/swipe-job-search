// Root layout with AuthProvider and auth gate
// Per AUTH_FLOWS.md routing: unauthenticated → login, authenticated → role-based routing
import { Slot, useRouter, useSegments } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import { useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/providers/AuthProvider';
import { useAuth } from '@/hooks/useAuth';
import '../global.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

function RootLayoutNav() {
  const { session, profile, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    const inAuth = segments[0] === '(auth)';
    // Cast needed since onboarding routes not in generated types yet
    const inOnboarding = (segments as string[])[0] === '(onboarding)';

    // Not authenticated - must be in auth routes
    if (!session && !inAuth) {
      router.replace('/(auth)/login');
      return;
    }

    // Authenticated but not loaded profile yet - wait
    if (session && !profile && !inAuth) {
      return;
    }

    // Authenticated with profile
    if (session && profile) {
      // Not onboarded - must be in onboarding
      if (!profile.onboarding_completed_at && !inOnboarding && !inAuth) {
        router.replace('/(onboarding)/role' as any);
        return;
      }

      // Onboarded - redirect to appropriate home based on role
      if (profile.onboarding_completed_at && inAuth) {
        if (profile.role === 'candidate') {
          router.replace('/(candidate)/(tabs)/deck' as any);
        } else if (profile.role === 'employer') {
          router.replace('/(employer)/(tabs)/jobs' as any);
        } else {
          // Role not set (shouldn't happen) - send to onboarding
          router.replace('/(onboarding)/role' as any);
        }
        return;
      }

      // Already onboarded but in onboarding routes - redirect to home
      if (profile.onboarding_completed_at && inOnboarding) {
        if (profile.role === 'candidate') {
          router.replace('/(candidate)/(tabs)/deck' as any);
        } else if (profile.role === 'employer') {
          router.replace('/(employer)/(tabs)/jobs' as any);
        }
        return;
      }
    }
  }, [session, profile, loading, segments, router]);

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-950">
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  return <Slot />;
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <RootLayoutNav />
      </AuthProvider>
    </QueryClientProvider>
  );
}
