// Root layout with AuthProvider and auth gate
// Per AUTH_FLOWS.md routing: unauthenticated → login, authenticated → role-based routing
import { Slot, useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/providers/AuthProvider';
import { useAuth } from '@/hooks/useAuth';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { getRoleHomeRoute, ROUTES, routerHref } from '@/lib/routing';
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
    const inOnboarding = segments[0] === '(onboarding)';

    if (!session && !inAuth) {
      router.replace(routerHref(ROUTES.login));
      return;
    }

    if (session && !profile && !inAuth) {
      return;
    }

    if (session && profile) {
      if (!profile.onboarding_completed_at && !inOnboarding && !inAuth) {
        router.replace(routerHref(ROUTES.onboardingRole));
        return;
      }

      const homeRoute = getRoleHomeRoute(profile.role);

      if (profile.onboarding_completed_at && inAuth) {
        router.replace(routerHref(homeRoute));
        return;
      }

      if (profile.onboarding_completed_at && inOnboarding) {
        router.replace(routerHref(homeRoute));
        return;
      }

      if (profile.onboarding_completed_at && !inAuth && !inOnboarding && !segments[0]) {
        router.replace(routerHref(homeRoute));
      }
    }
  }, [session, profile, loading, segments, router]);

  if (loading) {
    return <LoadingScreen />;
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
