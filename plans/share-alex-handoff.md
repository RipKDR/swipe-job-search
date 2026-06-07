# Product Handoff: Share Job Card + Invite Friend Referral

**Feature:** Share Job Cards Externally + Invite-to-App Referral Programme
**Product Area:** Swipe Deck → Organic Growth Engine
**Status:** ✍️ Validated — Ready for Implementation
**Priority:** HIGH — Top growth lever after Streak + Bookmarks
**Date:** 2026-06-07
**Author:** Alex (Product Research)

---

## 1. Feature Summary

Two tightly coupled capabilities that together form Hi-Hired's organic growth engine:

### Capability A — Share Job Card

A candidate or employer can share any individual job card as a rich preview link to external messaging apps (WhatsApp, iMessage, Telegram, Discord), social platforms, or the system share sheet. The shared card renders as an Open Graph preview with the job title, company, salary, location, and a CTA to "Apply on Hi-Hired."

- Recipients who already have Hi-Hired installed are deep-linked straight to that job's detail screen.
- Recipients who do **not** have the app land on a job landing page (mobile web) with a prominent "Get Hi-Hired to apply" install CTA.
- All outgoing shares carry a tracking parameter (`?ref=<sharer_id>`) for attribution.

### Capability B — Invite Friends (Referral Programme)

A dedicated invite flow that lets a user (candidate or employer) send a referral link to friends. Referred signups are attributed to the inviter via a unique referral code embedded in the deep link.

- **Candidate-to-candidate invites:** "Know someone looking for work? Send them this link."
- **Employer-to-employer invites:** "Know another business hiring? They'll love Hi-Hired."
- **Referral rewards:** Inviters earn streak bonus days or extra Super Applies for successful referrals (see §6).

### Why This Matters Now

| Factor | Detail |
|--------|--------|
| **Asuria meeting upcoming** | A credible organic growth engine (viral coefficient > 0.3) demonstrates to Asuria that Hi-Hired has a scalable user acquisition channel beyond paid ads |
| **Streak + Bookmarks create habit** | Users now have daily routines and saved-job inventories — they're more likely to evangelise the app because they're invested |
| **Job sharing is native behaviour** | People already share job openings in WhatsApp groups, Discord servers, and Facebook groups. Hi-Hired giving them a structured way to do it captures attribution that currently goes to Google Sheets screenshots |
| **Melbourne local virality** | A hospitality job at a Fitzroy cafe shared in a Melbourne barista WhatsApp group has natural network density — one share reaches 10-50 relevant peers |
| **Employer-side sharing** | Employers who post a job want to share it across their own channels (Instagram, Facebook, industry Slack groups). Making this easy with Hi-Hired's branding builds awareness passively |
| **PRD §7 already sketches the viral loop** | "Candidates can share any job card as a rich preview link" and "Invite a friend prompt shown after first match" — this feature closes the loop that the PRD opened |

### Risk Assessment

| Risk | Mitigation |
|---|---|
| **Share abuse / spam** | Rate-limit shares per user per day (30 max). Flag anomalous share patterns via event outbox. |
| **Deep link to deleted/expired jobs creates poor experience** | Landing page checks job status and shows a friendly "This job is no longer available" if expired. |
| **Referral rewards cannibalise Super Apply monetisation** | Rewards are limited to streak-related perks (freeze days, bonus applies) that don't directly compete with monetisation. Free users never pay anyway. |
| **GDPR/privacy from shared content** | Shared cards contain only public job data (title, company, salary, suburb) — no personal candidate info. See §7. |
| **Low adoption — nobody shares** | Share button is visible but not intrusive. If <2% share rate after 2 weeks, add post-match share prompt and A/B test placement. |
| **Viral loop only works at density** | True — but Melbourne hospitality community is already dense. A share in a 300-member barista Facebook group can reach dozens of relevant job seekers. Measure K and adjust. |

---

## 2. User Stories

### Share Job Card Stories

| ID | Story | Priority |
|----|-------|----------|
| SHARE-01 | **As a candidate**, I want to share a job card I'm excited about with a friend who might be interested so they can apply too | P0 (MVP) |
| SHARE-02 | **As a candidate**, I want the share target to open the job in Hi-Hired if my friend already has the app installed so they can see details and apply immediately | P0 (MVP) |
| SHARE-03 | **As a candidate**, I want my friend without Hi-Hired to see a nice preview of the job and a link to install the app so they can still access it | P0 (MVP) |
| SHARE-04 | **As a candidate**, I want to share a job from the detail screen or directly from the deck card so I can share without leaving the swiping flow | P1 (Ship with MVP) |
| SHARE-05 | **As an employer**, I want to share my own job posting externally (e.g., to my Instagram, Facebook, industry Slack) so I can drive more applicants | P0 (MVP) |
| SHARE-06 | **As an employer**, I want the share preview to include my business name and branding so it looks professional | P1 (v1.1) |
| SHARE-07 | **As a shared-card recipient**, I want to see the job pay, location, and company before tapping through so I can decide if I'm interested | P0 (MVP) |
| SHARE-08 | **As a shared-card recipient without the app**, I want to see a mobile-optimised landing page with the full job description and a clear CTA to install Hi-Hired and apply | P0 (MVP) |
| SHARE-09 | **As an employer**, I want to see how many times my job has been shared so I know which posts are generating buzz | P1 (v1.1) |

### Invite Friend / Referral Stories

| ID | Story | Priority |
|----|-------|----------|
| INVITE-01 | **As a candidate**, I want to invite friends to download Hi-Hired so we can job search together and I can earn rewards | P0 (MVP) |
| INVITE-02 | **As a candidate**, I want a personalised referral link/code I can share anywhere so friends know the invite is from me | P0 (MVP) |
| INVITE-03 | **As a new user**, I want to see who referred me when I sign up so I know why I'm here and who to thank | P0 (MVP) |
| INVITE-04 | **As a candidate**, I want to see how many of my invites have successfully signed up so I can track my progress toward rewards | P1 (Ship with MVP) |
| INVITE-05 | **As a candidate**, I want to receive my referral reward automatically when a friend completes onboarding so I don't have to claim it manually | P0 (MVP) |
| INVITE-06 | **As an employer**, I want to invite other businesses to post on Hi-Hired and earn rewards for each business that posts their first job | P2 (Post-MVP) |
| INVITE-07 | **As a candidate**, I want a "Know someone hiring?" referral option so I can earn rewards for sending employer leads | P2 (Post-MVP) |
| INVITE-08 | **As a provider agent (Asuria)**, I want a unique referral link I can give to DES participants to download the app so I can onboard job seekers faster | P1 (v1.1 — discuss with Asuria) |

---

## 3. Acceptance Criteria

### AC-01: Share Button on Job Detail Screen

```
Given I am viewing any job's detail screen (candidate or employer role)
When I tap the share icon in the header bar (top-right, next to bookmark star)
Then the native OS share sheet opens
  AND the share payload contains:
    - URL: https://hi-hired.app/job/{job_id}?ref={my_user_id}
    - Title: "{job_title} at {company_name}"
    - Description: "{pay_display} · {suburb}"
    - OG image: {job_photo_url} or fallback to app logo
```

- **Icon:** Square-and-up-arrow (system share icon on iOS, ShareActionProvider on Android).
- **Placement:** Top-right of job detail screen header, immediately right of the bookmark star.
- **Size:** 44×44pt minimum tap target.
- **Accessibility label:** "Share this job"

### AC-02: Share Button on Deck Job Card

```
Given I am swiping through the deck as a candidate
When I long-press a job card (or tap a "···" menu on the card)
  AND I select "Share"
Then the same native share sheet opens with the same payload as AC-01
```

- **Alternative trigger:** A small share icon in the card footer alongside the bookmark icon.
- **Recommendation:** Share icon visible at all times on the card (bottom-right, 32×32pt) rather than hidden behind a menu. Job sharing should be as frictionless as possible. If the card is too cluttered, hide behind long-press context menu (fallback).

### AC-03: Native Share Sheet Integration

```
Given any share flow is triggered
Then the native OS share sheet is presented with the following share items:
  - URL (the job link or referral link)
  - Text preview
  - (optional) Image

Given the user selects WhatsApp
Then the shared message reads:
  "Hey! Check out this job on Hi-Hired — {job_title} at {company_name}, {pay_display} in {suburb} 🎯 {link}"

Given the user selects iMessage
Then the same text + link + OG preview card are rendered inline

Given the user selects "Copy Link"
Then only the URL is copied to clipboard
  AND a brief toast appears: "Link copied ✨"
```

- **Supported share targets (OS handles this — no per-platform code needed):** WhatsApp, iMessage, Telegram, Instagram, Facebook Messenger, Discord, Slack, Email, Copy Link, AirDrop, AnyOther.
- **No custom share sheet.** Always use the native OS sharing interface. Users expect this behaviour.
- **URL is always the last item in the share payload** so preview text truncation doesn't cut it off.

### AC-04: Deep Link — Installed User

```
Given a recipient opens a shared link on a device with Hi-Hired installed
Then the app opens at the job detail screen for that specific job
  AND the share attribution (ref={sharer_id}) is logged server-side

Given the recipient has not logged in yet
Then the app opens to the login screen
  AND after successful login, the user is redirected to the shared job's detail screen
  AND the share attribution is logged at that point

Given the shared job has been deleted or expired
Then the app shows a screen: "This job is no longer available"
  AND suggests "Browse other jobs on Hi-Hired" with a CTA to the swipe deck
```

- **URL scheme:** `hi-hired://job/{job_id}` for cold-start deep linking.
- **Universal link (iOS) / App Link (Android):** Use `https://hi-hired.app/job/{job_id}` as the primary URL. iOS will handle Universal Link routing to the app if installed; Android handles App Links similarly. Fallback to custom scheme if Universal/App Links fail.
- **Referral param:** The `?ref=` parameter is parsed on app open and attributed server-side (not stored client-side — write to `share_events` table on server).

### AC-05: Landing Page — Non-Installed User

```
Given a recipient opens a shared link on a device WITHOUT Hi-Hired installed
Then the browser loads https://hi-hired.app/job/{job_id}
  AND renders a mobile-optimised landing page showing:
    - Job title, company name, pay, suburb, hours
    - Brief description (first 200 chars + "Read more" expand)
    - At least one photo if available
    - "Get the app to apply" primary CTA button
    - Secondary CTA: "See all jobs near you" (optional — links to app store or web search)
    - App Store / Google Play badge buttons
    - Og meta tags for rich link preview (across all platforms)
  AND the ?ref={sharer_id} param is passed to app attribution on install

Given the shared job has been deleted or expired
Then the landing page shows: "This job has been filled" or "This job is no longer accepting applications"
  AND a "Browse more jobs on Hi-Hired" CTA
  AND no 404 / broken page state
```

- **Landing page URL structure:** `https://hi-hired.app/job/{job_id}` — share this one URL everywhere. It handles both installed and non-installed cases.
- **SSR/static generation:** The landing page should be server-rendered or statically generated for fast initial load with full OG meta tags. No client-side JS required to view the basic job info.
- **SEO:** Each job landing page gets its own canonical URL. Indexable by Google. This also improves employer SEO — their job now appears on Google from Hi-Hired.
- **Referral tracking:** After app install + login, if the install was attributed to a `?ref=` param (via deep link or web-to-app attribution), the referral reward is credited to the sharer.

### AC-06: Share Tracking

```
Given any shared link is opened (regardless of recipient install status)
Then a share_event row is inserted with:
  - sharer_id: the user who shared
  - job_id: the job being shared (null for generic invite shares)
  - recipient_installed: true/false (inferred from User-Agent or deep link open detection)
  - recipient_signed_up: uuid of new user if they signed up (nullable, linked on signup)
  - share_medium: the share target (WhatsApp, copy, etc. — from platform share sheet response if available, "unknown" otherwise)
  - opened_at: timestamp of first open
  - created_at: timestamp of the share event

Given the same link is opened by multiple recipients
Then each open generates a distinct share_event row
  (the ref param identifies the sharer, not the share instance — each open is independent)

Given a recipient opens the shared link multiple times
Then only the first open is counted for attribution (deduplicated by device_id or fingerprint)
```

- **Attribution model:** Last-click attribution (the referrer who last shared a link that the new user clicked before signup gets the reward).
- **Distinct share vs. open:** The share itself (user taps share) creates a `share_events` row with `event_type='share'`. The open (recipient taps link) creates a `share_events` row with `event_type='open'`. These are linked by a `share_token` (generated UUID at share time, embedded in the URL). This allows us to compute share-to-open conversion rate per sharer, per job, per channel.

### AC-07: Invite Friend Flow

```
Given I am a logged-in candidate on any screen
When I navigate to the "Invite Friends" section (in Profile or Settings)
Then I see:
  - My unique referral link: https://hi-hired.app/join?ref={my_referral_code}
  - My referral code: HI-{first_4_letters_of_name}-{random_3_digits} (e.g., HI-ALEX-742)
  - Current invite count: "You've invited X friends. Y have joined!"
  - Progress toward next reward: "2 more joins = +1 Super Apply" (see §6)
  - "Share invite link" button → opens native share sheet with:
    - Text: "I'm using Hi-Hired to find work in Melbourne — it's way faster than SEEK. Try it: {link}"
    - Title: "Join me on Hi-Hired"
    - Customisable message (user can edit before sending)
    - Link: {referral_link}

Given I am a new user who signed up via a referral link
Then on my first login, I see a subtle toast or banner:
  "🎉 You were invited by {sharer_name}! Welcome!"
  AND my profile stores referral_source = {sharer_id}
  AND no other referral attribution is possible (one referrer per user)
```

- **Referral code generation:** Deterministic prefix (first 4 chars of user's name, uppercased) + hyphen + random 3 alphanumeric chars. Collision check on insert — retry if duplicate (extremely low probability at < 10k users).
- **Referral code stored on `profiles` table:** Add a `referral_code` column (unique, nullable — backfill for existing users).
- **Referral attribution on `profiles` table:** Add a `referred_by` column (uuid, nullable, references profiles.id).

### AC-08: Referral Reward Delivery

```
Given a referred user completes onboarding (all required fields filled, including at least 1 swipe)
Then the referrer receives the reward automatically
  AND an in-app notification is delivered: "🎉 {friend_name} joined! You earned +1 Super Apply!"
  AND a push notification is sent (if referrer is not in-app): "🎉 Someone you invited joined Hi-Hired! Check your rewards."

Given the referrer is offline when the reward triggers
Then the reward is credited server-side and visible on next app open

Given a referred user signs up but never completes onboarding
Then no reward is credited (reward triggers at onboarding completion, not just signup)
```

- **Safeguard:** A referrer cannot earn rewards for referring themselves (same device_id or same IP within session window). Check during attribution.

### AC-09: Empty State — Invite Screen

```
Given I am a new user with 0 invites sent
When I navigate to the Invite Friends screen
Then I see:
  - Emoji header: "🤝 Invite Friends"
  - Subtitle: "Know someone job hunting? Share Hi-Hired and earn rewards!"
  - "Share your invite link" CTA button (pulsing, primary)
  - "Your invites: 0 | Friends joined: 0" stats row
  - Progress bar: "0/3 friends joined → +1 Super Apply" (empty bar)
  - No ghost state — even zero invites is a positive call to action
```

### AC-10: Employer Share — Job Posting List

```
Given I am an employer viewing my posted jobs list
When I tap the share icon next to any job posting
Then the same native share sheet opens with the job's share URL
  AND I can share the job to any external channel
  AND a "Shares: {count}" metric appears on each job card in the list
```

### AC-11: Share Rate Limiting

```
Given a user attempts to share more than 30 job cards within a 24-hour window
Then the 31st share attempt is blocked
  AND a toast appears: "You've reached the daily share limit (30). Try again tomorrow."
  AND no damage to existing shares or link functionality

Given a user's share pattern triggers the fraud detection threshold
  (>100 shares in 1 hour across any time window)
Then the share endpoint returns 429
  AND the event is logged to the event_outbox for admin review
  AND the user's shares are temporarily suspended (24h cooldown via a `shares_suspended_until` flag on profiles)
```

---

## 4. Data Model & Schema

### New Table: `share_events`

Every share action and every share-link open gets a row. This is the core tracking table.

```sql
-- 202606070005_share_events.sql

-- Tracks every share action and every share-link open.
-- One row per share action, one row per open — linked by share_token.
-- Enables: virality analysis, share-to-open conversion, referrer attribution.

create table public.share_events (
  id                  uuid        primary key default gen_random_uuid(),
  event_type          text        not null check (event_type in ('share', 'open')),
  sharer_id           uuid        not null references public.profiles(id) on delete cascade,
  job_id              uuid        references public.jobs(id) on delete set null,

  -- Links a 'share' event to subsequent 'open' events
  -- Generated at share time as a random UUID; embedded in the shared URL as ?stkn=
  share_token         uuid        not null,

  -- Attribution metadata
  recipient_installed boolean,    -- true if the app was installed when link was opened
  recipient_signed_up uuid        references public.profiles(id) on delete set null,
  share_medium        text,       -- inferred share target, e.g. 'whatsapp', 'copy', 'unknown'

  -- Timestamps
  created_at          timestamptz not null default now()
);

-- Sharer's job shares, newest first
create index idx_share_events_sharer
  on public.share_events (sharer_id, created_at desc);

-- Opens for a specific share token (chart share-to-open conversion)
create index idx_share_events_token
  on public.share_events (share_token);

-- Job-level share metrics
create index idx_share_events_job
  on public.share_events (job_id, event_type)
  where job_id is not null;

-- RLS
alter table public.share_events enable row level security;

-- Sharer sees their own share events
create policy "share_events_select_own"
  on public.share_events for select
  using (sharer_id = auth.uid());

-- Anyone can insert (the trigger function handles attribution)
create policy "share_events_insert"
  on public.share_events for insert
  with check (true);

-- No update or delete (immutable event log)
```

### New Table: `referral_rewards`

Tracks reward grants — who earned what, when, and whether it's been claimed/consumed.

```sql
-- 202606070006_referral_rewards.sql

-- Rewards earned by users for successful referrals.
-- One row per reward grant. Multiple rows per referrer.

create table public.referral_rewards (
  id            uuid        primary key default gen_random_uuid(),
  referrer_id   uuid        not null references public.profiles(id) on delete cascade,
  referred_id   uuid        not null references public.profiles(id) on delete cascade,
  reward_type   text        not null check (reward_type in (
    'extra_super_apply',    -- +1 Super Apply allocation
    'streak_freeze_day',    -- 1 streak freeze token
    'streak_bonus_day'      -- +1 day added to current streak
  )),
  quantity      smallint   not null default 1,
  status        text        not null default 'granted' check (status in ('granted', 'consumed', 'expired')),
  granted_at    timestamptz not null default now(),
  consumed_at   timestamptz,

  -- Prevent duplicate rewards for the same referrer+referred pair
  constraint referral_rewards_unique_pair
    unique (referrer_id, referred_id, reward_type)
);

-- Referrer sees their rewards
create index idx_referral_rewards_referrer
  on public.referral_rewards (referrer_id, granted_at desc);

-- RLS
alter table public.referral_rewards enable row level security;

create policy "referral_rewards_select_own"
  on public.referral_rewards for select
  using (referrer_id = auth.uid());

create policy "referral_rewards_insert_own"
  on public.referral_rewards for insert
  with check (referrer_id = auth.uid());

-- Only the reward system writes to this table; users read only.
-- Consumed status is updated by the reward-claim system.
```

### Profile Table Additions

```sql
-- Add to profiles table (alter existing)
alter table public.profiles
  add column if not exists referral_code   text unique,
  add column if not exists referred_by     uuid references public.profiles(id),
  add column if not exists shares_suspended_until timestamptz;

-- Index for referral code lookups (fast O(1) on signup)
create index if not exists idx_profiles_referral_code
  on public.profiles (referral_code)
  where referral_code is not null;
```

### RPC: `record_share_event`

```sql
-- Server-side RPC to record a share action with a generated share_token.
-- Called when a user taps "Share" on a job card or invite screen.

create or replace function public.record_share_event(
  p_job_id uuid default null,
  p_share_medium text default 'unknown'
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_share_token uuid := gen_random_uuid();
  v_daily_share_count int;
  v_suspended_until timestamptz;
begin
  if v_user_id is null then
    return json_build_object('error', 'Not authenticated', 'allowed', false);
  end if;

  -- Check rate limit
  select count(*) into v_daily_share_count
  from public.share_events
  where sharer_id = v_user_id
    and event_type = 'share'
    and created_at > now() - interval '24 hours';

  if v_daily_share_count >= 30 then
    return json_build_object(
      'error', 'Daily share limit reached (30)',
      'allowed', false,
      'share_token', null
    );
  end if;

  -- Check suspension
  select shares_suspended_until into v_suspended_until
  from public.profiles
  where id = v_user_id;

  if v_suspended_until is not null and v_suspended_until > now() then
    return json_build_object(
      'error', 'Shares suspended until ' || v_suspended_until,
      'allowed', false,
      'share_token', null
    );
  end if;

  -- Record the share event
  insert into public.share_events (
    event_type, sharer_id, job_id, share_token, share_medium
  ) values (
    'share', v_user_id, p_job_id, v_share_token, p_share_medium
  );

  -- PostHog event via outbox (async)
  insert into public.event_outbox (
    event_type, payload, status
  ) values (
    'share_created',
    jsonb_build_object(
      'sharer_id', v_user_id,
      'job_id', p_job_id,
      'share_token', v_share_token,
      'share_medium', p_share_medium
    ),
    'pending'
  );

  return json_build_object(
    'allowed', true,
    'share_token', v_share_token,
    'daily_share_count', v_daily_share_count + 1
  );
end;
$$;
```

### RPC: `record_open_event`

```sql
-- Called when a shared link is opened (landing page or deep link handler).

create or replace function public.record_open_event(
  p_share_token uuid,
  p_recipient_installed boolean default false,
  p_recipient_id uuid default null
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sharer_id uuid;
  v_job_id uuid;
begin
  -- Get the original share details
  select sharer_id, job_id into v_sharer_id, v_job_id
  from public.share_events
  where share_token = p_share_token and event_type = 'share'
  limit 1;

  if v_sharer_id is null then
    return json_build_object('error', 'Invalid share token');
  end if;

  -- Record the open event
  insert into public.share_events (
    event_type, sharer_id, job_id, share_token,
    recipient_installed, recipient_signed_up
  ) values (
    'open', v_sharer_id, v_job_id, p_share_token,
    p_recipient_installed, p_recipient_id
  );

  -- PostHog event via outbox
  insert into public.event_outbox (
    event_type, payload, status
  ) values (
    'share_link_opened',
    jsonb_build_object(
      'sharer_id', v_sharer_id,
      'job_id', v_job_id,
      'share_token', p_share_token,
      'recipient_installed', p_recipient_installed,
      'recipient_id', p_recipient_id
    ),
    'pending'
  );

  return json_build_object('success', true);
end;
$$;
```

### Edge Function: `process-referral-reward`

- **Trigger:** After a referred user completes onboarding (`profiles.onboarding_completed_at` flips from null to a timestamp AND `profiles.referred_by` is not null).
- **Logic:**
  1. Fetch the referred user's `referred_by` value.
  2. Check the referrer hasn't already been rewarded for this referral (dedup on `referral_rewards.referred_id`).
  3. Insert a `referral_rewards` row with `reward_type = 'extra_super_apply'`, `quantity = 1`.
  4. Update referrer's `super_applies_remaining` (or equivalent daily quota field) if applicable.
  5. Trigger an in-app notification + push notification for the referrer.
- **Cron alternative:** If real-time trigger is too heavy, run a daily cron that checks for `onboarding_completed_at` changes in the last 24h and processes pending rewards.

---

## 5. Success Metrics

### Viral Growth Targets

| Metric | Month 1 Target | Month 3 Target | Month 6 Target |
|--------|---------------|----------------|----------------|
| **Viral coefficient K** (avg. new users invited by each existing user) | **0.15** | **0.30** | **0.50** |
| **Share rate** (% of job views that result in a share) | **2%** | **4%** | **6%** |
| **Shares per active user per week** | **0.5** | **1.5** | **3** |
| **Referral conversion rate** (% of shared-link opens → signup) | **8%** | **12%** | **15%** |
| **% of new signups from referral** | **5%** | **15%** | **25%** |
| **Invite screen visit rate** (% of weekly actives who view invite screen) | **10%** | **20%** | **30%** |
| **Invite-to-signup conversion** (% of invites sent → friend signs up) | **5%** | **8%** | **10%** |
| **Share-to-open rate** (% of shares that get at least 1 open) | **20%** | **30%** | **40%** |
| **Reward redemption rate** (% of earned rewards that get consumed) | **60%** | **70%** | **80%** |

### Viral Coefficient K Calculation

```
K = (avg. shares per user) × (% of shares that result in a signup)

Month 1 target: 0.5 shares/user/week × 30% share-to-signup = K ≈ 0.15
Month 3 target: 1.5 × 20% = K ≈ 0.30
Month 6 target: 3.0 × 16.6% = K ≈ 0.50
```

- K < 1 means viral loop is not self-sustaining (still valuable — reduces CAC).
- K ≥ 1 means organic growth without paid acquisition.
- Target is K ≈ 0.30 by Month 3. This is realistic for a localised job app with **high density triggers** (Melbourne hospitality WhatsApp groups, barista communities).

### North Star Proxy

**% of weekly new signups attributed to referral** — if >15% of signups arrive via a `?ref=` or referral code, the mechanic is driving meaningful organic growth.

### Key Tracking Events

```typescript
// Share a job
posthog.capture('job_shared', {
  job_id: string,
  role: 'candidate' | 'employer',
  share_medium: string,  // 'whatsapp' | 'copy' | 'message' | 'unknown'
  source: 'deck' | 'detail' | 'employer_list'
})

// Shared link opened
posthog.capture('share_link_opened', {
  share_token: string,
  job_id: string | null,
  recipient_installed: boolean,
  share_medium: string
})

// Invite screen viewed
posthog.capture('invite_screen_viewed', {
  invites_sent: number,
  friends_joined: number,
  next_reward_progress: string
})

// Invite link shared
posthog.capture('invite_link_shared', {
  share_medium: string,
})

// Referral signup
posthog.capture('referral_signup', {
  referrer_id: string,
  reward_type: string,
  reward_quantity: number,
})

// Reward earned
posthog.capture('referral_reward_earned', {
  reward_type: string,
  quantity: number,
  total_earned: number
})

// Reward consumed
posthog.capture('referral_reward_consumed', {
  reward_type: string,
  quantity: number,
})
```

---

## 6. Monetisation Tie-In & Referral Rewards

### Reward Tiers (Candidate)

| Milestone | Reward | Value to User | Why This Reward |
|-----------|--------|---------------|-----------------|
| **1 friend joined** | +1 Super Apply (one-time) | ~$1-2 equivalent (Boost tier) | Immediate gratification — first reward is easy to earn |
| **3 friends joined in a month** | +1 Streak Freeze Day (can miss 1 day without losing streak) | Protects streak investment | Aligns with streak engagement mechanic |
| **5 friends joined total** | +2 Super Applies (one-time) | Increased recruiter visibility | Meaningful utility — helps users see the value of referring |
| **10 friends joined total** | +1 Streak Bonus Day (+1 day added instantly to current streak) | Streak acceleration | High-status feeling — boosts streak number without effort |
| **20 friends joined total** | "Top Referrer" badge on profile (visible to employers) | Social proof + employer interest | Status reward — shows the user is well-connected |

**Design principles:**
- Rewards are **non-monetary** (no cash, no gift cards — keeps unit economics simple).
- Rewards **reinforce core engagement loops** (Super Applies, streaks) rather than distracting.
- Rewards are **earned cumulatively** — hitting 5 friends grants the 5-friend reward, doesn't reset the counter.
- No reward expiry at MVP — earned rewards stay available until consumed. Revisit if users hoard >10.

### Employer Referral Rewards (P2)

| Milestone | Reward |
|-----------|--------|
| **1 referred business posts their first job** | 1 week free Local Boost for the referrer's own job |
| **5 referred businesses post** | 1 month free City Boost |

### Impact on Monetisation

| Risk | Mitigation |
|------|------------|
| Free Super Applies from referral cannibalise Boost/Paid tiers | Super Applies from referral are one-off bonuses, not daily quota increase. The daily cap (3/day) stays. Bonus applies just increase the pool, not the per-day limit. |
| Users churn after earning streak freeze day | Streak freeze day reinforces the streak habit — it's retention-positive, not retention-negative. |
| No referral reward incentivises employer sharing | Employer sharing doesn't need rewards at MVP. Employers share jobs because they want applicants. The share link itself is the value. Add employer rewards in P2 if employer share rate is low. |

---

## 7. Edge Cases

| Edge Case | Handling |
|-----------|----------|
| **Share while offline** | Optimistic UI: immediately open the native share sheet with the URL. The share is queued and logged when connectivity returns. If the user goes offline before the share is logged, the share event is lost — this is acceptable for MVP (imperfect attribution is better than blocking the share flow). |
| **Deep link to deleted/expired job** | The app's deep link handler checks `jobs.status` before navigating. If status ≠ 'active', redirect to a "job unavailable" screen with a "Browse more jobs" CTA, not a blank or crashing state. |
| **Deep link to job the user has already swiped left on** | Show the job detail as usual (the user might want to reconsider). The swipe-left is not a permanent block — it's a "not right now." No special handling needed. |
| **Share to non-installed user (fallback to web view)** | The landing page (`https://hi-hired.app/job/{job_id}`) handles this fully. The page is mobile-optimised, shows job details, has App Store/Play Store buttons, and passes the referral token through to app attribution on install. |
| **GDPR/privacy for shared content** | Shared job cards contain **zero personal data** — only public job metadata (title, company, pay, suburb, description). No candidate names, photos, or application status is included. The referral link contains only an anonymous user ID (`ref=uuid`), not the user's name or email. |
| **User shares job they already applied to** | No restriction. The share is about the job, not the user's application status. |
| **Self-referral (user installs app themselves via their own link)** | Prevented by IP + device fingerprint matching. If the referrer's device_id matches the new signup's device_id within a 7-day window, the referral is invalidated and no reward is credited. |
| **Same user referred by multiple people** | First-click attribution: the first referral link the user opens before signing up gets the credit. Stored once on `profiles.referred_by`. Subsequent referral link opens are logged but do not overwrite. |
| **User deletes account — what happens to their referral code?** | Referral code is a unique constraint on profiles. If the user is deleted (cascade), their referral code is freed. However, existing `share_events.sharer_id` and `referral_rewards.referrer_id` are set to null by `ON DELETE SET NULL` pattern (not cascade — we don't want to delete attribution data). |
| **Referred user signs up, then deletes account** | The referrer keeps the reward (it was earned when onboarding completed). The referred user's deletion does not retroactively revoke rewards. |
| **Share a job that uses a different language (English + Australian colloquialisms)** | The share link and landing page use the same language as the job posting. No translation at MVP. Revisit if international job postings become common. |
| **Rate-limited user tries to share from multiple devices** | Rate limit is per user_id (server-side), not per device. 30 shares across all devices in 24h. |
| **Employer shares a job that's already hired** | The share still goes through (employer may want to announce the hire). The job detail screen on the recipient side shows "filled" status. For job-seeker recipients, the landing page shows "This position has been filled" + alternative suggestions. |
| **Asuria provider shares a job on behalf of a candidate** | Provider agent has bulk-swipe consent. Share events logged with `sharer_id = candidate_id` (the candidate, not the agent) if the share action was performed on behalf of the candidate. For provider-portal sharing, the share links should reference the candidate's referral code, not the agent's. |

---

## 8. Open Questions (For Build Discussion)

1. **Share sheet customisation — can we pass a user-editable message?**
   - Native share sheets on iOS/Android support a "subject" field. Some apps add a "custom message" prefill. **Recommendation:** Use the URL + default description as-is for MVP. Adding a custom-message UI overlay before the share sheet opens is a P1 enhancement. The WhatsApp/Message preview already lets users edit before sending.

2. **Landing page — static generation vs. SSR?**
   - Hundreds of active jobs → potentially hundreds of landing pages. **Recommendation:** Server-render at request time (SSR with caching, 5-minute TTL). Static generation for every job doesn't scale if jobs churn daily. Use Vercel Edge Functions or a simple Next.js page at `hi-hired.app/job/[id]` with `getServerSideProps`.

3. **Referral code collisions — how to handle?**
   - Deterministic prefix (first 4 chars) + random 3 alphanumeric → ~36³ = 46,656 combos per prefix. With 10k users, chance of collision is low per-user. **Recommendation:** On referral code generation, retry up to 3 times on `unique_violation`. If all 3 fail, append a 4th random char (rare at <100k users).

4. **Should share tracking work on web (not just mobile app)?**
   - **Recommendation:** Yes — the deck also works on web (Expo web output). The native share sheet fallback on web is the Web Share API (supported in Chrome/Safari desktop since 2022). If Web Share API is unavailable, fall back to "Copy link" with a text field.

5. **Reward consumption UX — where does the user use their bonus Super Apply?**
   - **Recommendation:** The Super Apply button already exists as "swipe up." The bonus applies are reflected in the user's remaining Super Apply count for the day. No new UI is needed for consumption. For streak freeze days, add a "Use freeze day" toggle on the streak indicator or automatically consume the freeze day when the streak would break. **Open:** Auto-consume vs. manual toggle? Auto-consume is better UX but may surprise users. Manual toggle risks users forgetting and losing their streak. **Alex recommends auto-consume with an in-app notification:** "Your streak was frozen! (You had 2 freeze days remaining.)"

6. **Should employer shares be attributed differently?**
   - The same `share_events` table handles both. Employer shares have `sharer_id` pointing to the employer (a profiles row with `role='employer'`). No reward for employer sharing at MVP, but we still want the share count metric. **Question:** Should employer share URLs carry a different parameter so we can segment for analytics? `?ref=` works for both; the role is inferred from the profiles table.

7. **Invite flow entry point — where in the UI?**
   - **Recommendation:** Invite Friends lives in Profile (as a section card) and also in Settings as a standalone row. Additionally, show a one-time "Invite a friend" nudge on the swipe deck after the user's 3rd match (not after 1st — too early). Entry points:
     - Profile: "🤝 Invite Friends" card with current count + progress
     - Settings: "Invite Friends" row with share icon
     - Deck: Subtle banner after 3rd match: "Know someone else job hunting? They'll love this — share Hi-Hired" (dismissible, shows once per week)

8. **Should the landing page capture email for follow-up if the recipient doesn't install?**
   - **Recommendation:** No at MVP. It adds friction and trust concerns ("why do they want my email?"). If landing page bounce rate is >80% and drop-off is high, add a passive "Get notified when similar jobs appear" email capture as a P2 A/B test.

9. **Deep link timing — what if the user opens the link >30 days after it was shared?**
   - **Recommendation:** Attribution still counts. The share is a static snapshot. However, the landing page should check if the job is still active and, if not, suggest other jobs (as described in AC-04/AC-05). The referral reward for signups still triggers — there's no time limit on referral attribution at MVP. Revisit if stale links become a support issue.

10. **Should we show the sharer's name on the landing page?**
    - **Recommendation:** Yes — "Shared by {sharer_first_name}" in the landing page header, pulled from `profiles.full_name`. This provides social proof and context. The sharer must have been notified of this during onboarding or when they first share (add to TOS/privacy notice). Users can opt out in Privacy settings.

---

## 9. Implementation Order

| Step | Description | Est. Effort |
|------|-------------|-------------|
| 1 | DB migrations: `share_events` table + `referral_rewards` table + profile columns + indexes + RLS | 1d |
| 2 | RPCs: `record_share_event`, `record_open_event` (server-side attribution) | 0.5d |
| 3 | `process-referral-reward` Edge Function (trigger on onboarding completion) | 1d |
| 4 | Share button component — reusable, accessible, with `expo-sharing` integration | 1d |
| 5 | Integrate share button into `JobDetailScreen.tsx` header | 0.5d |
| 6 | Integrate share button into `JobCard.tsx` (deck card, bottom-right corner) | 0.5d |
| 7 | Deep link handling — `hi-hired://job/{job_id}` route, `?ref=` attribution parser | 1d |
| 8 | Landing page — `https://hi-hired.app/job/[id]` (SSR, OG tags, app store CTAs) | 2d |
| 9 | Invite Friends screen (Profile section) — referral code display, stats, share CTA | 1d |
| 10 | Referral code generation on profile creation (deterministic + random suffix) | 0.5d |
| 11 | Reward system — credit + notification on successful referral | 1d |
| 12 | Invite/referral progress in Profile (progress bar, milestone indicators) | 0.5d |
| 13 | Employer share count on job list (employer tab) | 0.5d |
| 14 | Rate limiting (30/day) + fraud detection (100/hour suspension) | 0.5d |
| 15 | Post-match share nudge (banner on deck after 3rd match) | 0.5d |
| 16 | PostHog analytics events (8 new events) | 0.5d |
| 17 | Landing page: expired/deleted job handling | 0.5d |
| 18 | "Top Referrer" badge (P2 — profile badge for 20+ referrals) | 0.5d |
| 19 | Tests: unit (RPCs, referral logic, rate limits) + integration (deep links, landing page) | 2d |
| | **Total MVP** (steps 1-16) | **~12.5d** |
| | **Total Full Scope** (steps 1-19) | **~15.5d** |

---

## 10. Dependencies

- **Universal Links / App Links setup** — iOS `apple-app-site-association` + Android `assetlinks.json` must be deployed on `hi-hired.app` domain. This configures the OS to open URLs in the app instead of the browser. This is a one-time infra setup (~1 hour).
- **expo-sharing** — already in `package.json` (`^56.0.15`). Used to trigger native share sheet. Verify it works with plain URLs (it does — sharing is the primary purpose).
- **expo-linking** — already in `package.json` (`^56.0.12`). Used for deep link handling in app.
- **Landing page server/route** — needs a new route in the Next.js web app (or standalone function) at `hi-hired.app/job/[id]`. If the web app doesn't exist yet, use a Vercel Edge Function or serverless function.
- **Deep link routing in app** — add `/(candidate)/job/[id]` route in Expo Router. Register the `hi-hired` URL scheme handler for cold-start deep links.
- **PostHog** — already instrumented. Add 8 new events.
- **Supabase Edge Functions** — `process-referral-reward` needs to trigger on `profiles.onboarding_completed_at` changes. Use a database webhook or scheduled cron.
- **Event outbox** — already exists (`event_outbox` table, `outbox.py` processor). Use it for async PostHog event emission.
- **OneSignal / push notifications** — already wired. Reward notifications use existing push infrastructure.
- **No new external services** — all share/referral logic is Supabase + client-side share sheet + landing page.

---

## Appendix A: Viral Loop Diagram

```
┌─────────────────────────────────────────────────────────┐
│                    VIRAL LOOP                            │
│                                                          │
│  ┌──────────┐    Share     ┌───────────┐   Open link    │
│  │ Existing  │ ──────────→ │ Friend in │ ─────────────→ │
│  │  User     │   job card  │ WhatsApp  │                │
│  │           │             │   group   │                │
│  └─────┬─────┘             └─────┬─────┘                │
│        │                        │                       │
│        │                        ▼                       │
│        │              ┌──────────────────┐              │
│        │              │ Installed?       │              │
│        │              ├────────┬─────────┤              │
│        │              │  YES   │   NO    │              │
│        │              │   ↓    │    ↓    │              │
│        │              │  App   │ Landing │              │
│        │              │  opens │  page   │              │
│        │              │  → job │ → CTA   │              │
│        │              │ detail │ → App   │              │
│        │              │        │   Store │              │
│        │              └───┬────┴────┬────┘              │
│        │                  │         │                   │
│        │                  │         ▼                   │
│        │                  │  ┌──────────────┐           │
│        │                  │  │  Installs +   │           │
│        │                  │  │  Signs up    │           │
│        │                  │  │  (attributed)│           │
│        │                  │  └──────┬───────┘           │
│        │                  │         │                   │
│        ▼                  ▼         ▼                   │
│  ┌──────────────────────────────────────┐               │
│  │  Referral reward credited to sharer  │               │
│  └──────────────────────────────────────┘               │
│                                                          │
│  New user → becomes an existing user → shares a job     │
│  → loop repeats (if K > 0)                              │
└─────────────────────────────────────────────────────────┘
```

**Leakage points to monitor:**
- Share → Open conversion: How many shared links actually get tapped?
- Open → Install conversion: How many landing page visitors install the app?
- Install → Onboarding completion: How many installers complete onboarding (required for reward)?
- Onboarding → Share: How many new users become sharers themselves?

---

## Appendix B: URL Structure Reference

| URL | Purpose | Handled By |
|-----|---------|------------|
| `https://hi-hired.app/job/{job_id}?ref={user_id}&stkn={share_token}` | Job share link (primary, shared via share sheet) | Landing page (web) / Universal Link (app) |
| `hi-hired://job/{job_id}?ref={user_id}&stkn={share_token}` | Deep link fallback (if Universal Links fail) | App deep link handler |
| `https://hi-hired.app/join?ref={referral_code}` | Generic invite link (no specific job) | Landing page → App Store → install attribution |
| `hi-hired://join?ref={referral_code}` | Invite deep link fallback | App invite handler |

**URL parameter glossary:**
- `ref`: The user_id (UUID) of the person who shared/referred. Used for attribution.
- `stkn`: The share_token (UUID) that links a specific share action to subsequent opens. Generated per share action.

---

## Appendix C: Competitive Pattern Reference

| Platform | Share UX | Referral | Key Insight for Hi-Hired |
|----------|----------|----------|--------------------------|
| **LinkedIn** | Share button on every job post → native share sheet. OG preview with full job details. | Employee referral programme with cash bonuses for successful hires. | Share is table stakes. Referral rewards are cash-heavy (LinkedIn can afford it). Hi-Hired uses product-based rewards. |
| **SEEK** | "Share" button → opens a modal with social platform icons, not native sheet. Custom. | Employer referral rewards (discounts). No candidate referral. | SEEK's custom share sheet is dated. Use native. Skip the SEEK pattern. |
| **Indeed** | Share via social buttons at the bottom of job detail. No deep link — all web. | Employee referral tracking for employers, not candidates. | Indeed's focus is employer-side. Hi-Hired's candidate-to-candidate referral is the differentiator. |
| **Tinder** | Profile share → "Share Tinder Profile" via native sheet. Deep link to profile. | "Tinder Social" group feature (no referral rewards). Viral via organic word-of-mouth. | Tinder proves share-to-install funnel works for social apps. Job search can borrow the same mechanics. |
| **Uber** | Trip share → native sheet with live tracking. | Referral programme with free ride credit for both parties. | The gold standard for referral programme design. Simple, clear, immediate reward. Uber's "both sides get value" is the magic. Hi-Hired uses the same model (sharer gets reward, referred friend gets the app utility). |

---

*End of Handoff. Questions → route to Alex for clarification.*
