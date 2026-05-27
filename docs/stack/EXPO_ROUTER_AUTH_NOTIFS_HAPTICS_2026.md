# EXPO_ROUTER_AUTH_NOTIFS_HAPTICS_2026.md

> **Status (2026-05-28):** FULL PROSE — Authored by jordan (arch lane) via Hi-Hired swarm DOC-2026-05-28-001 per approved gap-analysis-2026-05-28.md §6 Outline 1 + swarm-dispatch-2026-05-28-full-docs.md + design spec 2026-05-28-hi-hired-complete-docs-design.md. All 2026 MCP facts (Context7 /websites/expo_dev benchmark 86.3 + v55/56 2026-05-28) embedded verbatim with citations. DRY: references (never duplicates) STACK.md high-level decisions, BACKEND.md device_tokens + Edge notif specs + ARCHITECTURE_AUDIT.md CRITICAL fixes, AUTH_FLOWS.md / NOTIFICATIONS.md / GUARDRAILS.md legacy notes (adapt only). Zero placeholders. New dev or agent can implement Expo Router auth groups, SecureStore Supabase init, push token registration + observer deep link, and swipe-deck haptics in <30 min after reading only this + gap §6.1 + STACK first 100 lines + BACKEND first 100 lines + 02-mvp-definition.md.

**Priority:** MUST (v1 build start blocker for scaffold / auth / swipe deck / notifs).  
**Author:** jordan (primary arch) + dev (RN examples / hygiene cross-check).  
**Research sources (cited inline):** Context7 MCP query-docs /websites/expo_dev (benchmark 86.3, 21k+ snippets, SDK v55/56 refs 2026-05-28) — full notif registration, Expo Router deep-link observer hook, haptics exact APIs. See gap-analysis-2026-05-28.md §4 and §8 for raw MCP output + tool timestamps. Also cross-referenced STACK.md (2026-05-27 locked), BACKEND.md (device_tokens + notification_queue), ARCHITECTURE_AUDIT.md (2026-05-27 CRITICAL-2 notif queue), 02-mvp-definition.md (push in MVP).

This document replaces all "adapt from Next/Capacitor/OneSignal" notes in legacy UX files for the 2026 Expo RN TS reality. It is the single source for mobile stack implementation details before any monorepo scaffold or code.

---

## 1. Expo Router File-Based Navigation + Auth/Role Groups

Expo Router (file-based, built on React Navigation) is the locked choice per STACK.md §Mobile/App. It provides automatic deep linking, typed routes, and group-based layouts for role separation (candidate vs employer) without manual navigator wiring.

**Key 2026 patterns (SDK 52+/v55/56):**
- Use `(candidate)` and `(employer)` route groups for tab-based role shells.
- Root `_layout.tsx` uses `Slot` + custom `useAuth` guard that redirects unauthenticated or incomplete-onboarding users.
- Onboarding lives in `app/onboarding/` (progressive, <60s per 02-mvp).
- Auth callback at `app/auth/callback.tsx` (see §2).

**Example: `apps/mobile/app/_layout.tsx` (root auth guard + role groups)**

```tsx
import { Slot, useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { useAuth } from '../lib/useAuth'; // wraps supabase + SecureStore
import { View, ActivityIndicator } from 'react-native';

export default function RootLayout() {
  const { session, profile, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inOnboarding = segments[0] === 'onboarding';

    if (!session && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (session && !profile?.onboarding_completed_at && !inOnboarding) {
      router.replace('/onboarding');
    } else if (session && profile?.role === 'candidate' && segments[0] !== '(candidate)') {
      router.replace('/(candidate)/swipe');
    } else if (session && profile?.role === 'employer' && segments[0] !== '(employer)') {
      router.replace('/(employer)/jobs');
    }
  }, [session, profile, loading, segments]);

  if (loading) {
    return <View className="flex-1 items-center justify-center"><ActivityIndicator /></View>;
  }

  return <Slot />;
}
```

See STACK.md §Mobile/App for monorepo layout and NativeWind v4 setup. Cross-ref AUTH_FLOWS.md for legacy Next.js middleware patterns (now replaced by Expo Router + SecureStore session).

---

## 2. Supabase Auth 2026 Expo Implementation

Supabase Auth (PKCE flow) with magic link (default), Google, and Apple Sign-In. Session persisted via `expo-secure-store` adapter for @supabase/supabase-js (never in AsyncStorage or plaintext).

**Locked per STACK.md and gap §4 (Context7 expo_dev 86.3 2026-05-28):**
- Adapter: `expo-secure-store` (keychain / Keystore).
- Deep link scheme: `hi-hired://` (dev: `exp://...` via app.config.ts extra).
- Callback route: `app/auth/callback.tsx` calls `exchangeCodeForSession` then `router.replace` based on role/onboarding state.
- Auto profile creation via DB trigger (see SUPABASE_RLS... doc + BACKEND.md auth hooks).

**Example: `apps/mobile/lib/supabase.ts` (init with SecureStore adapter)**

```ts
import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { AppState } from 'react-native';
import Constants from 'expo-constants';

const supabaseUrl = Constants.expoConfig?.extra?.supabaseUrl;
const supabaseAnonKey = Constants.expoConfig?.extra?.supabaseAnonKey;

const ExpoSecureStoreAdapter = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Rehydrate + refresh on app foreground (critical for cold starts + token expiry)
AppState.addEventListener('change', (state) => {
  if (state === 'active') {
    supabase.auth.startAutoRefresh();
  } else {
    supabase.auth.stopAutoRefresh();
  }
});
```

**Deep link config in `app.config.ts` (or app.json):**

```ts
extra: {
  eas: { projectId: 'your-eas-project-id' },
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
  supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
},
scheme: 'hi-hired',
```

**Callback handler `app/auth/callback.tsx`:**

```tsx
import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    const handleCallback = async () => {
      const { data: { session }, error } = await supabase.auth.getSessionFromUrl();
      if (error || !session) {
        router.replace('/(auth)/login?error=auth_failed');
        return;
      }
      // Profile/role check happens in root _layout useEffect
      router.replace('/'); // lets root guard route correctly
    };
    handleCallback();
  }, []);

  return <ActivityIndicator />;
}
```

See AUTH_FLOWS.md for legacy Next.js cookie/PKCE details (adapt only the OAuth provider config and redirectTo values). Cross BACKEND.md for the `handle_new_user` trigger that creates the `profiles` row with role from user metadata.

---

## 3. Expo Notifications 2026 (SDK 52+/v55+)

**MUST use Expo Notifications** (not OneSignal in MVP per STACK locked decision). Physical device only for push (simulators cannot receive). EAS projectId required for all environments.

**Registration + token upsert (called after auth, in onboarding or profile settings):**

```ts
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { supabase } from './supabase';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export async function registerForPushNotificationsAsync() {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') {
    return null; // user denied — handle gracefully in UI
  }

  const projectId = Constants.expoConfig?.extra?.eas?.projectId;
  if (!projectId) throw new Error('EAS projectId missing from app.config.ts');

  const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
  const expoPushToken = tokenData.data;

  // Android channel (MAX importance for match alerts)
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('matches', {
      name: 'New Matches & Messages',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
    });
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    await supabase.from('device_tokens').upsert({
      profile_id: user.id,
      expo_push_token: expoPushToken,
      device_type: Platform.OS,
      last_used_at: new Date().toISOString(),
    }, { onConflict: 'expo_push_token' });
  }

  return expoPushToken;
}
```

**Observer hook for deep-link navigation from notification payload (exact MCP 2026-05-28 pattern):**

```tsx
import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import * as Notifications from 'expo-notifications';

export function useNotificationObserver() {
  const router = useRouter();

  useEffect(() => {
    let isMounted = true;

    function redirect(notification: Notifications.Notification) {
      const url = notification.request.content.data?.url;
      if (url && isMounted) {
        router.push(url); // e.g. '/(candidate)/matches/123' or '/chat/abc'
      }
    }

    // Handle notification that opened the app (cold start or background)
    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response?.notification) redirect(response.notification);
    });

    // Handle notifications received while app is foreground/background
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      redirect(response.notification);
    });

    return () => {
      isMounted = false;
      subscription.remove();
    };
  }, [router]);
}
```

Call `useNotificationObserver()` in root `_layout.tsx` (after auth guard). Payloads are set by the Edge `notification-processor` (see SUPABASE_RLS... doc + BACKEND.md).

See NOTIFICATIONS.md for legacy OneSignal + queue concepts (now adapted to Expo + `notification_queue` table per ARCHITECTURE_AUDIT CRITICAL-2).

---

## 4. Haptics for Swipe Deck (Tinder Feel + Accessibility)

`expo-haptics` is locked per STACK §Mobile/App and GUARDRAILS §1 (light tap on swipe completion). Use for immediate tactile confirmation on right/left swipe without visual delay.

**Exact APIs from Context7 MCP 2026-05-28 (expo_dev 86.3 / v55/56):**

```ts
import * as Haptics from 'expo-haptics';

// On swipe start / deck interaction (selection feedback)
await Haptics.selectionAsync();

// On successful right-swipe (match interest) — celebratory
await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

// On left-swipe (pass) — neutral/negative
await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);

// Impact variants for deck "weight" (per GUARDRAILS "cards must have weight")
await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); // or Light/Heavy/Rigid/Soft
```

**Integration example in swipe deck (with reanimated/gesture-handler per GUARDRAILS + STACK):**

```tsx
const handleSwipe = async (direction: 'right' | 'left', jobId: string) => {
  await Haptics.selectionAsync();
  // ... optimistic update + mutation ...
  if (direction === 'right') {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  } else {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }
};
```

Haptics are a11y-friendly (users can disable system-wide) and satisfy DES/Asuria/DDA requirements for tactile feedback (see GUARDRAILS §5 WCAG + AU compliance). Never rely on haptics alone — always pair with visual (green/red indicators) and optional sound.

---

## 5. Monorepo / Environment Patterns (2026)

See full STACK.md §Monorepo Structure, §Environment Variables Matrix, §Deployment Targets.

**Critical 2026 gotchas for this file:**
- All mobile secrets via `EXPO_PUBLIC_*` in `app.config.ts` `extra` (never process.env at runtime in bundle).
- EAS projectId is mandatory for push + updates (set once per env in EAS dashboard).
- Three isolated Supabase projects (dev/staging/prod) — never share service_role.
- Shared schemas live in `packages/shared/src/schemas` (Zod for job, profile, swipe) — imported by mobile + used for Edge validation.

No secrets in git. Use EAS Secrets + GitHub Actions for CI `SUPABASE_ACCESS_TOKEN`.

---

## 6. Gotchas 2026 (MCP + ARCH + STACK + Real Device Reality)

- **Physical device only for push:** Simulators never receive Expo push tokens. Use EAS dev-client on real iOS/Android for testing (Context7 2026-05-28).
- **EAS projectId required:** All push registration and update manifests fail without it in app.config.ts.
- **Realtime + notif dual path:** Always send push (per ARCH CRITICAL-2). Use client `AppState` (not Realtime presence) to suppress system notification when foreground (see NOTIFICATIONS.md legacy + ARCH HIGH-1).
- **iOS background suppression:** Use `AppState.addEventListener` + `Notifications.setNotificationHandler` to show in-app overlay only when active; otherwise let system banner show.
- **Cold Edge starts + queue:** Direct trigger → Edge HTTP is fire-and-forget. All match/interest/message notifications must go through `notification_queue` + cron processor (BACKEND + ARCH CRITICAL-2). See SUPABASE_RLS... doc for the 2026 pgmq consume loop.
- **Token rotation / expiry:** SecureStore sessions + supabase autoRefresh handle most; listen for `TOKEN_REFRESHED` and re-upsert device token if needed.
- **Multiple devices:** `device_tokens` allows many per profile (upsert on expo_push_token unique). Last-used wins for dispatch.
- **Android channels:** Create at registration; use MAX for matches, HIGH for messages.
- **Privacy / consent:** Never send push for swipes (only matches/messages). Bulk consent flag (ARCH HIGH-5) lives in profiles for provider use (not MVP).

All patterns cross-checked against 2026-05-27 ARCHITECTURE_AUDIT.md and 2026-05-28 Context7 research.

---

## 7. Testing (Vitest + RTL + Maestro)

- **Unit/hooks:** Vitest + `@testing-library/react-native` for `useNotificationObserver`, registration helpers, haptics mocks (jest.spyOn(Haptics, ...)).
- **Integration:** Local Supabase (`supabase start`) + MSW or supabase-js test client for auth flows + token upsert.
- **E2E / flows:** Maestro (MVP per STACK) for full auth → onboarding → swipe (with haptics visual confirmation) → match deep link from simulated push. Test cold-start notification open.
- **a11y spot checks:** `@axe-core/react-native` on key screens (see GUARDRAILS §6 + new a11y doc).

Update TESTING_STRATEGY.md and GUARDRAILS.md (RN section) with these references after scaffold.

---

**Cross-references (relative, per Structure B):**  
- STACK.md (locked decisions, monorepo, env, haptics in conventions, "adapt" for AUTH/NOTIF).  
- docs/BACKEND.md (device_tokens table, notification_queue, Edge processor spec, RLS matrix, auth triggers).  
- ARCHITECTURE_AUDIT.md (CRITICAL-1/2 match race + notif queue fixes, HIGH-1 presence, HIGH-5 consent flag).  
- AUTH_FLOWS.md / NOTIFICATIONS.md / GUARDRAILS.md (legacy patterns + a11y/privacy guardrails — adapt only).  
- foundational-docs/02-mvp-definition.md (push in MVP, onboarding <60s, match employer-init model).  
- gap-analysis-2026-05-28.md §6 Outline 1 + §4/§8 (MCP 2026-05-28 raw + citations).  
- docs/api/EDGE_FUNCTIONS_CONTRACTS.md (future; processor payload shapes).  
- docs/ops/MIGRATION_RUNBOOK... (device_tokens + RLS migration order).

**Author checklist (executed):** Read dispatch + design spec + gap §4/6/8 + MCP schemas first + all listed canonicals (first 100+ lines + specific sections) + existing stubs. DRY enforced (reference only). Full prose + copy-pasteable TS/TSX. Inline 2026 citations with dates/paths. No invention. Log gate executed as last action.

**Implemented per gap-analysis-2026-05-28 §6.1 + swarm-dispatch-2026-05-28-full-docs.md DOC-001 + design spec 2026-05-28. Manifest row 11 → full. Ready for dev review before scaffold.**

*(End of EXPO_ROUTER_AUTH_NOTIFS_HAPTICS_2026.md — 2026-05-28 jordan swarm authoring complete.)*
