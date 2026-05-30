# CLERK_EXPO_PATTERNS_2026.md

> **Status (2026-05-29):** Reference doc for `/clerk-expo-patterns` analysis on Hi-Hired mobile. **Clerk is not installed** in `apps/mobile` today. DRY: canonical Supabase auth patterns remain in [EXPO_ROUTER_AUTH_NOTIFS_HAPTICS_2026.md](./EXPO_ROUTER_AUTH_NOTIFS_HAPTICS_2026.md) and live code under `apps/mobile/`. Official Clerk Expo docs: [Clerk Expo quickstart](https://clerk.com/docs/expo/getting-started/quickstart), [Clerk + Supabase](https://clerk.com/docs/integrations/databases/supabase).

**Priority:** SHOULD (future auth UX / B2B orgs — not MVP blocker).
**Recommendation:** **Defer full migration**; keep Supabase Auth for MVP. Revisit Clerk for org switching, richer OAuth UX, or web+mobile auth parity post-v1.

---

## 1. Current Hi-Hired auth stack (baseline)

| Concern | Location | Notes |
|---------|----------|-------|
| Login UI (magic link + Google/Apple OAuth) | `apps/mobile/app/(auth)/login.tsx` | `WebBrowser.maybeCompleteAuthSession()` already called (line 23) |
| OAuth / magic-link callback | `apps/mobile/app/(auth)/callback.tsx` | Supabase PKCE / token exchange via `completeAuthCallback` |
| Session + profile context | `apps/mobile/providers/AuthProvider.tsx` | `onAuthStateChange`, fetches `profiles` by `session.user.id` |
| Supabase client + SecureStore | `apps/mobile/lib/supabase.ts` | Native: `expo-secure-store`; web: `localStorage` |
| Auth gate + role routing | `apps/mobile/app/_layout.tsx` + `lib/auth-gate.ts` | Custom guard (not Expo Router `<Stack.Protected>`) |
| Redirect URLs | `apps/mobile/lib/routing.ts` → `getAuthRedirectUrl()` | Web: `{origin}/callback`; native: `hi-hired://auth/callback` |
| Deep link scheme | `apps/mobile/app.config.ts` | `scheme: 'hi-hired'` |
| DB identity | `supabase/migrations/202605270003_profiles.sql` | `profiles.id` → `auth.users(id)`; `handle_new_user()` trigger |
| RLS | All migrations / tests | Policies use `auth.uid()` |

**Versions (compatible with `@clerk/expo` v3+):** Expo ~56, React Native 0.85, `expo-secure-store` already installed.

---

## 2. Clerk Expo patterns — mapped to this repo

### 2.1 Root provider (`app/_layout.tsx`)

Today:

```tsx
<AuthProvider>
  <RootLayoutNav />  {/* useAuth() → Supabase session + profile */}
</AuthProvider>
```

Clerk equivalent (would wrap **outside** or **replace** `AuthProvider` only after migration plan):

```tsx
import { ClerkProvider } from '@clerk/expo';
import { tokenCache } from '@clerk/expo/token-cache';

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!;

export default function RootLayout() {
  return (
    <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
      <RootLayoutNav />
    </ClerkProvider>
  );
}
```

Add to `app.config.ts` `extra` (mirror Supabase env pattern):

```ts
clerkPublishableKey: process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY,
```

**Do not** use `NEXT_PUBLIC_*` — Metro only inlines `EXPO_PUBLIC_*` in production builds.

### 2.2 Token cache

Already have `expo-secure-store` plugin in `app.config.ts`. Clerk built-in:

```tsx
import { tokenCache } from '@clerk/expo/token-cache';
```

Uses SecureStore with `keychainAccessible: AFTER_FIRST_UNLOCK`. Hi-Hired already implements an equivalent pattern manually in `lib/supabase.ts` for Supabase sessions.

### 2.3 OAuth (`login.tsx`)

Today: `supabase.auth.signInWithOAuth` + `WebBrowser.openAuthSessionAsync` + `completeAuthCallback`.

Clerk v3+ pattern for same screen:

```tsx
import { useSSO } from '@clerk/expo';
import * as WebBrowser from 'expo-web-browser';

WebBrowser.maybeCompleteAuthSession(); // already at top of login.tsx

const { startSSOFlow } = useSSO();

const handleGoogle = async () => {
  const redirectUrl = 'hi-hired://auth/callback'; // match app.config scheme + routing.ts
  const { createdSessionId, setActive } = await startSSOFlow({
    strategy: 'oauth_google',
    redirectUrl,
  });
  if (createdSessionId) await setActive!({ session: createdSessionId });
};
```

Clerk Dashboard must allow redirect URLs: `hi-hired://auth/callback`, web `/callback`, and dev `exp://` origins.

### 2.4 Protected routes (Expo Router file groups)

Hi-Hired route groups:

```
app/
  (auth)/login.tsx, callback.tsx
  (onboarding)/...
  (candidate)/(tabs)/...
  (employer)/(tabs)/...
```

**Current approach (keep for Supabase MVP):** Imperative redirects in `_layout.tsx` via `resolveAuthRedirect()` — handles session **and** profile/onboarding/role (Clerk `useAuth().isSignedIn` alone is insufficient).

**Clerk-native options (post-migration):**

1. **Keep custom gate** — Replace `session` with `useAuth()` from `@clerk/expo`; still fetch `profiles` for role/onboarding (recommended for Hi-Hired).
2. **Expo Router layout guards** — In `(candidate)/_layout.tsx`, use `Redirect` when `!isSignedIn`.
3. **Do not** rely on Clerk alone for `(candidate)` vs `(employer)` — continue profile-based routing from `AuthProvider`.

### 2.5 Auth hooks mapping

| Hi-Hired today | Clerk equivalent |
|----------------|------------------|
| `useAuth()` in `hooks/useAuth.ts` → Supabase `AuthContext` | `useAuth()`, `useUser()` from `@clerk/expo` |
| `session.user.id` | `userId` from `useAuth()` |
| `signOut()` → `supabase.auth.signOut()` | `signOut()` from `useAuth()` or `useClerk()` |
| Profile role / onboarding | **Still** `profiles` table + AuthProvider (Clerk does not replace this) |

---

## 3. Common pitfalls (Hi-Hired–specific)

| Symptom | Cause | Fix |
|---------|-------|-----|
| `publishableKey` undefined in prod | Wrong env prefix or missing `extra` in `app.config.ts` | Use `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`; expose in `extra` like Supabase vars |
| OAuth returns to app but no session | Scheme / redirect mismatch | Align Clerk Dashboard, `getAuthRedirectUrl()`, and `scheme: 'hi-hired'` |
| Session lost on cold start | No `tokenCache` on `ClerkProvider` | Pass `tokenCache` from `@clerk/expo/token-cache` |
| `WebBrowser` hang on iOS | Missing `maybeCompleteAuthSession` | Already called in `login.tsx` — keep on any SSO entry screen |
| Signed in but stuck on login | Gate expects Supabase `session` + `profile` | Migration must update `AuthProvider` / `auth-gate.ts`, not just login |
| RLS denies all queries after Clerk | JWT not accepted by Supabase | Enable Clerk third-party in Supabase + configure JWT template |
| Profile row missing | `handle_new_user` fires on `auth.users` insert only | Add Clerk webhook → Supabase user sync, or hybrid JWT path with matching `sub` → `profiles.id` |
| Edge Functions 401 | Functions verify Supabase JWT | Update Edge auth to validate Clerk JWT or use service role + explicit user id |
| Duplicate auth systems | Clerk + Supabase Auth both active | Pick one identity source; use hybrid (Clerk → Supabase JWT) or full replace |

---

## 4. Integration assessment

### 4.1 Is Clerk installed?

**No.** `grep -r clerk apps/mobile package.json` returns no matches. Only reference: commented stub in `supabase/config.toml` `[auth.third_party.clerk]`.

### 4.2 Full migration (Supabase Auth → Clerk) — high level

| Step | Work | Risk |
|------|------|------|
| 1 | Add `@clerk/expo`, env vars, `ClerkProvider` in `_layout.tsx` | Low |
| 2 | Rewrite `login.tsx` / `callback.tsx` for Clerk SSO | Medium |
| 3 | Replace `AuthProvider` session source; map `userId` → profile fetch | Medium |
| 4 | **Database:** `profiles.id` FK to `auth.users` | **High** |
| 5 | **RLS:** policies use `auth.uid()` | **High** |
| 6 | **`handle_new_user` trigger** | **High** |
| 7 | **Edge Functions** | **High** |
| 8 | PostHog identify, push token registration | Medium |

### 4.3 Recommended: defer full migration

Per **AGENTS.md**: MVP is **Supabase-heavy**. Working auth already ships magic link, Google OAuth, SecureStore, and profile-aware routing.

**Clerk adds most value when:** B2B employer orgs, MFA, or unified auth across a future web app.

### 4.4 Hybrid path (auth-only layer, keep Supabase data plane)

1. Enable `[auth.third_party.clerk]` in `supabase/config.toml` + Clerk Supabase integration.
2. Mobile: Clerk for sign-in; Supabase client via Clerk JWT (`accessToken` callback).
3. Ensure Clerk `userId` matches `profiles.id` / `auth.uid()` — webhook or migration.
4. Keep `AuthProvider` profile fetch and `auth-gate.ts`; swap session provider underneath.

---

## 5. Minimal scaffold checklist (when explicitly requested)

Do **not** run until product approves migration:

```bash
cd apps/mobile
npx expo install @clerk/expo expo-secure-store expo-web-browser
```

Files to touch: `app.config.ts`, `app/_layout.tsx`, `app/(auth)/login.tsx`, `providers/AuthProvider.tsx`, `lib/supabase.ts`, `supabase/config.toml`, migrations/webhooks.

---

## 6. Cross-references

- [EXPO_ROUTER_AUTH_NOTIFS_HAPTICS_2026.md](./EXPO_ROUTER_AUTH_NOTIFS_HAPTICS_2026.md) §2
- [SUPABASE_RLS_EDGE_STORAGE_REALTIME_JOBS_2026.md](./SUPABASE_RLS_EDGE_STORAGE_REALTIME_JOBS_2026.md)
- Live: `apps/mobile/app/(auth)/login.tsx`, `providers/AuthProvider.tsx`, `lib/supabase.ts`, `app/_layout.tsx`

---

*(End of CLERK_EXPO_PATTERNS_2026.md — 2026-05-29; defer migration, hybrid documented.)*
