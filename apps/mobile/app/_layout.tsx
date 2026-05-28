// Root layout with AuthProvider and auth gate
// Per AUTH_FLOWS.md routing: unauthenticated → login, authenticated → role-based routing
import { Slot, useRouter, useSegments, usePathname, useGlobalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PostHogProvider } from 'posthog-react-native';
import { AuthProvider } from '@/providers/AuthProvider';
import { useAuth } from '@/hooks/useAuth';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { ProfileLoadError } from '@/components/ui/ProfileLoadError';
import { getRoleHomeRoute, ROUTES, routerHref, shouldRedirectForRoleMismatch } from '@/lib/routing';
import { initSentry } from '@/lib/sentry';
import * as Sentry from '@sentry/react-native';
import { initAnalytics } from '@/lib/analytics';
import { usePushRegistration, useNotificationObserver } from '@/hooks/usePushRegistration';
import { posthog } from '@/lib/posthog';
import '../global.css';

initSentry();
initAnalytics();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

function RootLayoutNav() {
  const { session, profile, loading, profileLoadFailed, retryProfileFetch } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const pathname = usePathname();
  const params = useGlobalSearchParams();
  const previousPathname = useRef<string | undefined>(undefined);
  const [retryingProfile, setRetryingProfile] = useState(false);

  useEffect(() => {
    if (previousPathname.current !== pathname) {
      posthog.screen(pathname, { previous_screen: previousPathname.current ?? null, ...params });
      previousPathname.current = pathname;
    }
  }, [pathname, params]);

  usePushRegistration();
  useNotificationObserver();

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
      const group = segments[0];

      if (
        profile.onboarding_completed_at &&
        shouldRedirectForRoleMismatch(profile.role, group, true)
      ) {
        router.replace(routerHref(homeRoute));
        return;
      }

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

  if (session && !profile && profileLoadFailed) {
    return (
      <ProfileLoadError
        loading={retryingProfile}
        onRetry={async () => {
          setRetryingProfile(true);
          try {
            await retryProfileFetch();
          } finally {
            setRetryingProfile(false);
          }
        }}
      />
    );
  }

  if (session && !profile) {
    return <LoadingScreen message="Loading your profile…" />;
  }

  return <Slot />;
}

function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <PostHogProvider
        client={posthog}
        autocapture={{
          captureScreens: false,
          captureTouches: true,
          propsToCapture: ['testID'],
          maxElementsCaptured: 20,
        }}
      >
        <AuthProvider>
          <RootLayoutNav />
        </AuthProvider>
      </PostHogProvider>
    </QueryClientProvider>
  );
}

// Expo Router apps use app/_layout.tsx as root entry (no App.tsx export to wrap).
// If a custom entry with an App component is introduced later, wrap that export instead.
export default Sentry.wrap(RootLayout);
