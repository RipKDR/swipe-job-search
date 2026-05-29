// Root layout with AuthProvider and auth gate
// Per AUTH_FLOWS.md routing: unauthenticated → login, authenticated → role-based routing
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { ProfileLoadError } from '@/components/ui/ProfileLoadError';
import { useAuth } from '@/hooks/useAuth';
import { useNotificationObserver, usePushRegistration } from '@/hooks/usePushRegistration';
import { initAnalytics } from '@/lib/analytics';
import { posthog } from '@/lib/posthog';
import { resolveAuthRedirect } from '@/lib/auth-gate';
import { getRoleHomeRoute, routerHref, ROUTES, shouldRedirectForRoleMismatch, type AppRoute } from '@/lib/routing';
import { initSentry, wrapApp } from '@/lib/sentry';
import { AuthProvider } from '@/providers/AuthProvider';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Slot, useGlobalSearchParams, usePathname, useRouter, useSegments } from 'expo-router';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Platform } from 'react-native';
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

// Web-safe PostHogProvider — renders children directly on web
function SafePostHogProvider({ children }: { children: ReactNode }) {
  if (Platform.OS === 'web') {
    return <>{children}</>;
  }
  try {
    const { PostHogProvider } = require('posthog-react-native');
    return (
      <PostHogProvider
        client={posthog}
        autocapture={{
          captureScreens: false,
          captureTouches: true,
          propsToCapture: ['testID'],
          maxElementsCaptured: 20,
        }}
      >
        {children}
      </PostHogProvider>
    );
  } catch {
    return <>{children}</>;
  }
}

function RootLayoutNav() {
  const { session, profile, loading, profileLoadFailed, retryProfileFetch } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const pathname = usePathname();
  const params = useGlobalSearchParams();
  const previousPathname = useRef<string | undefined>(undefined);
  const lastAuthRedirectRef = useRef<string | null>(null);
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

    const authTarget = resolveAuthRedirect({
      loading,
      session,
      profile: profile
        ? { role: profile.role, onboarding_completed_at: profile.onboarding_completed_at }
        : null,
      segments: [...segments],
    });

    if (authTarget) {
      if (lastAuthRedirectRef.current !== authTarget) {
        lastAuthRedirectRef.current = authTarget;
        router.replace(routerHref(authTarget as AppRoute));
      }
      return;
    }
    lastAuthRedirectRef.current = null;

    if (session && profile) {
      const homeRoute = getRoleHomeRoute(profile.role);
      const group = segments[0];
      const inAuth = segments[0] === '(auth)';
      const inOnboarding = segments[0] === '(onboarding)';

      if (
        profile.onboarding_completed_at &&
        shouldRedirectForRoleMismatch(profile.role, group, true)
      ) {
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
      <SafePostHogProvider>
        <AuthProvider>
          <RootLayoutNav />
        </AuthProvider>
      </SafePostHogProvider>
    </QueryClientProvider>
  );
}

// Expo Router apps use app/_layout.tsx as root entry.
// Sentry.wrap is web-safe (no-op on web).
export default wrapApp(RootLayout);
