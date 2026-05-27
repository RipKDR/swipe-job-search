# Swipe Job Search Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a functional "Tinder-for-Jobs" MVP with swiping, applications, and basic match logic.

**Architecture:** Next.js + Supabase. Heavy focus on Framer Motion for the gesture-based UI.

**Tech Stack:** Next.js, TypeScript, Tailwind, Framer Motion, Supabase.

---

### Task 1: Project Setup & Supabase Migration

**Files:**
- Create: `supabase/migrations/20260526_init.sql`
- Create: `.env.local`

- [ ] **Step 1: Initialize local setup**
Run: `npm create next-app@latest . --typescript --tailwind --app`

- [ ] **Step 2: Create Supabase Schema**
```sql
-- Profiles table
create table profiles (
  id uuid references auth.users on delete cascade primary key,
  role text check (role in ('candidate', 'recruiter')),
  name text,
  bio text,
  avatar_url text,
  updated_at timestamp with time zone default now()
);

-- Jobs table
create table jobs (
  id uuid default gen_random_uuid() primary key,
  recruiter_id uuid references profiles(id),
  title text,
  company text,
  location text,
  salary text,
  description text,
  images text[]
);

-- Swipes table
create table swipes (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id),
  job_id uuid references jobs(id),
  direction text check (direction in ('left', 'right')),
  created_at timestamp with time zone default now(),
  unique(user_id, job_id)
);
```

- [ ] **Step 3: Setup Env**
Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

---

### Task 2: The Swipe Logic (Framer Motion)

**Files:**
- Create: `components/SwipeDeck.tsx`
- Create: `components/JobCard.tsx`

- [ ] **Step 1: Implement JobCard with Gestures**
```tsx
import { motion, useMotionValue, useTransform } from 'framer-motion';

export const JobCard = ({ job, onSwipe }) => {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-25, 25]);
  const opacity = useTransform(x, [-200, -150, 0, 150, 200], [0, 1, 1, 1, 0]);

  return (
    <motion.div
      drag="x"
      style={{ x, rotate, opacity }}
      dragConstraints={{ left: 0, right: 0 }}
      onDragEnd={(_, info) => {
        if (info.offset.x > 100) onSwipe('right');
        else if (info.offset.x < -100) onSwipe('left');
      }}
      className="absolute w-80 h-96 bg-white rounded-xl shadow-xl p-4 cursor-grab active:cursor-grabbing border text-black"
    >
      <img src={job.images[0]} className="h-48 w-full object-cover rounded-lg" />
      <h2 className="text-xl font-bold mt-2">{job.title}</h2>
      <p className="text-gray-600">{job.company}</p>
      <div className="mt-4 flex gap-2">
         <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-sm">{job.salary}</span>
      </div>
    </motion.div>
  );
};
```

- [ ] **Step 2: Implement Deck State Management**
In `SwipeDeck.tsx`, manage an array of jobs. On swipe, pop the top job and call the Supabase `swipes` insert.

---

### Task 3: Application Flow & "Match" Logic

**Files:**
- Create: `app/api/swipe/route.ts`

- [ ] **Step 1: Create Swipe API**
Handle the insertion into the `swipes` table and check if the recruiter has a reciprocal interest (for future-proofing the match).

- [ ] **Step 2: Optimistic UI updates**
Ensure the card vanishes immediately, even if the database is slow.

---

### Task 4: Match View & Realtime Messaging

**Files:**
- Create: `app/matches/page.tsx`
- Create: `components/ChatRoom.tsx`

- [ ] **Step 1: Create Match List View**
Query the `matches` view in Supabase.
```tsx
const { data: matches } = await supabase
  .from('matches')
  .select('*, jobs(*), profiles(*)')
  .order('created_at', { ascending: false });
```

- [ ] **Step 2: Implement Realtime Chat Component**
```tsx
export const ChatRoom = ({ matchId }) => {
  const [messages, setMessages] = useState([]);
  
  useEffect(() => {
    // 1. Initial Load
    // 2. Subscribe to new messages
    const channel = supabase
      .channel(`match:${matchId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, payload => {
        setMessages(prev => [...prev, payload.new]);
      })
      .subscribe();
      
    return () => { supabase.removeChannel(channel); };
  }, [matchId]);

  return (
    <div className="flex flex-col h-full bg-gray-50">
       <div className="flex-1 overflow-y-auto p-4">
         {messages.map(m => <MessageBubble key={m.id} message={m} />)}
       </div>
       <ChatInput onSend={(text) => sendMessage(matchId, text)} />
    </div>
  );
};
```

- [ ] **Step 3: Add "It's a Match" Modal**
Create a visual overlay using `framer-motion` that triggers when a swipe results in a new match record.

---

### Task 5: Auth Flows & Role-Based Onboarding

**Spec:** `AUTH_FLOWS.md`

**Files:**
- Create: `app/auth/callback/route.ts`
- Create: `middleware.ts`
- Create: `app/onboarding/page.tsx`
- Create: `app/auth/login/page.tsx`
- Update: `supabase/migrations/` — add `handle_new_user` trigger + RLS policies

- [ ] **Step 1: Supabase Auth callback route**
Implement PKCE code exchange at `/auth/callback`. Redirect to `/onboarding` for new users, `/swipe` for returning candidates, `/recruiter/dashboard` for recruiters.

- [ ] **Step 2: Middleware for protected routes**
All routes under `/swipe`, `/matches`, `/chat`, `/recruiter`, `/provider` require an active session. Unauthenticated users redirect to `/auth/login?next=<path>`.

- [ ] **Step 3: Login page**
Three options: Magic Link (email OTP), Continue with Google, Continue with Apple. Apple Sign-In required for iOS App Store compliance.

- [ ] **Step 4: Role selection & onboarding screens**
After first login: role selection → profile setup (candidate: photos/CV parse; recruiter: company + ABN; provider: organisation + DES licence). Onboarding complete when `profiles.type` is set.

- [ ] **Step 5: Auto-profile trigger + RLS policies**
Apply all RLS policies from `SPEC.md §5` and `AUTH_FLOWS.md §7`. Run `supabase db push`.

---

### Task 6: Recruiter Job Posting Flow

**Spec:** `RECRUITER_FLOW.md`

**Files:**
- Create: `app/recruiter/dashboard/page.tsx`
- Create: `app/recruiter/jobs/new/page.tsx` (multi-step Job Card Builder)
- Create: `app/recruiter/jobs/[id]/candidates/page.tsx` (candidate review deck)
- Create: `app/api/jobs/route.ts`
- Create: `app/api/jobs/[id]/route.ts`

- [ ] **Step 1: Job Card Builder (6-screen wizard)**
Screens: Role basics → Salary + Award check → Vibe tags → Photos → Description → Preview/Publish. Fair Work Award minimum rate validation on salary entry. ABN verified against ABR API on account creation.

- [ ] **Step 2: Recruiter dashboard**
Show active jobs with application counts. Quick-action: pause, close, boost a job.

- [ ] **Step 3: Candidate review deck**
Recruiters see a SwipeDeck of candidates who applied to their job. Same Framer Motion gestures. Swipe right → mutual match. Swipe left → passes candidate. Super swipe → marks as top pick (candidate notified).

- [ ] **Step 4: Job performance analytics (Pro tier)**
Card view showing: impressions, right-swipe rate, match count, interviews, hires.

---

### Task 7: Provider Dashboard & Compliance Export

**Spec:** `ASURIA_PARTNERSHIP.md`, `NOTIFICATIONS.md`

**Files:**
- Create: `app/provider/dashboard/page.tsx`
- Create: `app/provider/candidates/[id]/page.tsx`
- Create: `supabase/functions/compliance-export/index.ts`
- Create: `supabase/functions/match-notification/index.ts`
- Update: `supabase/migrations/` — add `matches` DB trigger, `streaks` table

- [ ] **Step 1: Provider dashboard — caseload view**
List all assigned candidates with: swipe activity this week, match count, last active date, mentor notes. Filter by active/inactive/placed.

- [ ] **Step 2: Bulk-Swipe ("Blast") for mentors**
Provider mentors can swipe right on jobs on behalf of ready-to-work candidates (requires stored consent flag on candidate profile). Actions logged as compliance activities.

- [ ] **Step 3: match-notification Edge Function**
DB trigger on `matches` INSERT → Edge Function → push notification to candidate + recruiter via OneSignal + Supabase Realtime broadcast. Full spec in `NOTIFICATIONS.md §3`.

- [ ] **Step 4: compliance-export Edge Function**
Cron trigger Monday 7:00 AEDT. Aggregate weekly swipes/matches/hires per candidate → generate PDF (React PDF renderer) → upload to private Supabase Storage → email download link via Resend. DSS activity code mapping in `ANALYTICS_PLAN.md §6`.

- [ ] **Step 5: Private job feed**
"Asuria Partner Jobs" — jobs flagged `is_partner_exclusive=true` only appear in the deck for candidates whose provider has the partner feed enabled.

---

### Task 8: Analytics Instrumentation

**Spec:** `ANALYTICS_PLAN.md`

**Files:**
- Create: `lib/analytics.ts` (PostHog init + typed `capture` wrapper)
- Update: `app/layout.tsx` — PostHogProvider
- Update: all major components/pages — add event calls per taxonomy in `ANALYTICS_PLAN.md §3`

- [ ] **Step 1: PostHog setup**
Init PostHog in `lib/analytics.ts`. Wrap app in `PostHogProvider`. Configure: `capture_pageview: false` (manual), mask sensitive inputs in session recordings.

- [ ] **Step 2: Core event instrumentation**
Add `posthog.capture()` calls for all events in `ANALYTICS_PLAN.md §3`:
swipe events (`job_card_swiped`, `job_card_viewed`), auth events, match events, recruiter events, revenue events.

- [ ] **Step 3: Identify users post-auth**
Call `posthog.identify(userId, { role })` after session established. Enables per-user funnels.

- [ ] **Step 4: Streak tracking**
DB trigger on `swipes` INSERT → `update-streak` Edge Function → upsert `streaks` table. Streak displayed on deck view header.

- [ ] **Step 5: A/B test setup**
Configure PostHog feature flags for `onboarding_variant` (CV-first vs photos-first). Assign users on first load, persist in PostHog.

---

### Task 9: Mobile Optimisation & App Store Prep

**Spec:** `MOBILE_STRATEGY.md`

**Files:**
- Create: `public/manifest.json`
- Create: `capacitor.config.ts`
- Create: `lib/haptics.ts`
- Create: `lib/camera.ts`
- Create: `lib/push-notifications.ts`
- Update: `components/SwipeDeck.tsx` — integrate haptics
- Update: `supabase/migrations/` — add `push_token` column to profiles

- [ ] **Step 1: PWA manifest**
Add `public/manifest.json` with icons, theme colour (`#0f172a`), `display: standalone`, `start_url: /swipe`. Add `<link rel="manifest">` to `app/layout.tsx`.

- [ ] **Step 2: Capacitor project init**
`npx cap init` → `npx cap add ios` → `npx cap add android`. Configure `capacitor.config.ts` per `MOBILE_STRATEGY.md §3`.

- [ ] **Step 3: Haptic feedback integration**
Add `lib/haptics.ts`. Wire into `SwipeDeck.tsx`: card grab (light), threshold reached (medium), swipe complete (heavy/success), match (double buzz). Falls back silently on web.

- [ ] **Step 4: Push notification registration**
Add `lib/push-notifications.ts`. Call `registerPushNotifications(userId)` after auth. Save device token to `profiles.push_token`. Listens for foreground notifications → shows in-app toast instead of system notification.

- [ ] **Step 5: Camera integration**
Add `lib/camera.ts`. Replace `<input type="file">` on profile photo upload with `Camera.getPhoto()` on mobile (Capacitor detected via `Capacitor.isNativePlatform()`).

- [ ] **Step 6: App Store submission prep**
Complete checklist in `MOBILE_STRATEGY.md §8`: icons, screenshots, privacy policy URL, Apple Sign-In, Play Store data safety form.
