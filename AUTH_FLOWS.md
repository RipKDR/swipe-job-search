# Authentication Flows — Swipe Job Search

## 1. Auth Strategy Overview

Supabase Auth handles all authentication. The app supports three login methods, with magic link as the default frictionless path and OAuth for speed on mobile.

| Method | Use Case | Provider Config |
|--------|----------|----------------|
| Magic Link (email) | Default — zero password friction | Supabase built-in |
| Google OAuth | Mobile-first users; fastest on Android | Google Cloud Console OAuth 2.0 |
| Apple Sign-In | Required for iOS App Store | Apple Developer → Sign in with Apple |

---

## 2. Supabase Auth Configuration

### `supabase/config.toml` (local dev)
```toml
[auth]
site_url = "http://localhost:3000"
additional_redirect_urls = ["https://swipejobs.com.au", "exp://localhost:8081"]

[auth.email]
enable_confirmations = true
double_confirm_changes = true

[auth.external.google]
enabled = true
client_id = "env(GOOGLE_CLIENT_ID)"
secret = "env(GOOGLE_CLIENT_SECRET)"

[auth.external.apple]
enabled = true
client_id = "env(APPLE_CLIENT_ID)"
secret = "env(APPLE_CLIENT_SECRET)"
```

### Environment Variables
```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=          # server-side only, never expose to client
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
APPLE_CLIENT_ID=
APPLE_CLIENT_SECRET=
NEXT_PUBLIC_SITE_URL=https://swipejobs.com.au
```

---

## 3. Login Flow — Magic Link

```
User enters email
  → POST /auth/v1/otp (Supabase sends 6-digit OTP or magic link)
  → User clicks link / enters OTP
  → Supabase redirects to /auth/callback?code=xxx
  → Server exchanges code for session (PKCE flow)
  → Session stored in httpOnly cookie
  → Redirect to /onboarding (new user) or /swipe (returning user)
```

### `/app/auth/callback/route.ts`
```typescript
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/swipe'

  if (code) {
    const supabase = createRouteHandlerClient({ cookies })
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }
  return NextResponse.redirect(`${origin}/auth/error`)
}
```

---

## 4. Login Flow — Google / Apple OAuth

```
User taps "Continue with Google"
  → signInWithOAuth({ provider: 'google', redirectTo: '/auth/callback' })
  → Supabase redirects to Google consent screen
  → Google redirects back to /auth/callback?code=xxx
  → Same PKCE exchange as magic link
  → Profile created/linked in `profiles` table (see Trigger below)
```

### Auto-Profile Creation Trigger (Supabase SQL)
```sql
-- Fires on new auth.users row; creates skeleton profile
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (user_id, email, created_at)
  values (new.id, new.email, now())
  on conflict (user_id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
```

---

## 5. Role-Based Redirect After Login

After auth, the app checks `profiles.type` to route the user:

| Profile Type | Redirect |
|-------------|----------|
| `null` (new user) | `/onboarding` |
| `candidate` | `/swipe` |
| `recruiter` | `/recruiter/dashboard` |
| `provider` | `/provider/dashboard` |

### Middleware (`middleware.ts`)
```typescript
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextRequest, NextResponse } from 'next/server'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })
  const { data: { session } } = await supabase.auth.getSession()

  const isAuth = !!session
  const isAuthRoute = req.nextUrl.pathname.startsWith('/auth')
  const isPublic = ['/', '/about', '/pricing'].includes(req.nextUrl.pathname)

  if (!isAuth && !isAuthRoute && !isPublic) {
    return NextResponse.redirect(new URL('/auth/login', req.url))
  }

  if (isAuth && isAuthRoute) {
    return NextResponse.redirect(new URL('/swipe', req.url))
  }

  return res
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
```

---

## 6. Session Management

- Sessions are stored in httpOnly cookies (Next.js server components) via `@supabase/auth-helpers-nextjs`
- Token refresh is automatic — Supabase JS client handles this transparently
- Session TTL: 1 hour access token, 60-day refresh token (configurable in Supabase dashboard)
- Mobile (Capacitor): use `@supabase/supabase-js` with AsyncStorage for session persistence

### Signing Out
```typescript
const { error } = await supabase.auth.signOut()
// Clears cookie + invalidates refresh token
// Redirect to '/'
```

---

## 7. Row-Level Security Gates

Auth is only meaningful if RLS enforces it. These policies must be in place before any user data is read or written:

```sql
-- Profiles: users can only read/write their own
alter table profiles enable row level security;
create policy "Own profile only" on profiles
  for all using (auth.uid() = user_id);

-- Jobs: authenticated users can read; only recruiters can insert
create policy "Read jobs" on jobs
  for select using (auth.role() = 'authenticated');
create policy "Recruiter insert" on jobs
  for insert with check (
    exists (select 1 from profiles where user_id = auth.uid() and type = 'recruiter')
  );

-- Swipes: users can only insert their own swipes
create policy "Own swipes" on swipes
  for insert with check (auth.uid() = swiper_id);

-- Messages: only matched users can read/write
create policy "Match participants only" on messages
  for all using (
    exists (
      select 1 from matches m
      where m.id = match_id
      and (m.candidate_id = auth.uid() or
           exists (select 1 from jobs j where j.id = m.job_id and j.recruiter_id = auth.uid()))
    )
  );
```

---

## 8. Error States

| Error | User Message | Action |
|-------|-------------|--------|
| Magic link expired (>1hr) | "Your link has expired. Request a new one." | Re-send magic link button |
| OAuth denied | "Sign-in was cancelled." | Return to login screen |
| Email already registered | "An account with this email exists. Sign in instead." | Redirect to login |
| Session expired mid-session | Silent refresh fails → "Session expired. Please sign in again." | Redirect to `/auth/login?next=<current_path>` |
| Rate limited | "Too many attempts. Try again in 60 seconds." | Show countdown timer |

---

## 9. Onboarding Completion Gate

A user who has authenticated but not completed onboarding has `profiles.type = null`. Any protected route checks this and redirects to `/onboarding`. Onboarding is considered complete when:

- `profiles.type` is set to `candidate` or `recruiter`
- For candidates: at least 1 image uploaded OR CV parsed tags exist
- For recruiters: at least 1 job created

This gate is enforced in the route middleware and in the SwipeDeck component.
