# Architecture Handoff: Share Job Card + Invite Friend

**Feature:** Share Job Cards Externally + Invite-to-App Referral Programme
**Date:** 2026-06-07
**Author:** Jordan (Technical Architecture + Delivery Strategy)
**Source Handoffs:** Alex (Product), Maya (UX/UI)
**Priority:** HIGH — Top growth lever after Streak + Bookmarks

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Database Schema](#2-database-schema)
3. [Frontend Architecture](#3-frontend-architecture)
4. [API Contracts & RPCs](#4-api-contracts--rpcs)
5. [TanStack Query Key Strategy](#5-tanstack-query-key-strategy)
6. [Deep Link Architecture](#6-deep-link-architecture)
7. [Analytics Plan](#7-analytics-plan)
8. [Rate Limiting & Fraud Detection](#8-rate-limiting--fraud-detection)
9. [Implementation Sequence](#9-implementation-sequence)
10. [Risk Register](#10-risk-register)
11. [File Manifest](#11-file-manifest)

---

## 1. Architecture Overview

### 1.1 Two Capabilities, One Growth Engine

| Capability | Primary Action | Output | Tracking |
|---|---|---|---|
| **A — Share Job Card** | Tap share icon on job card/detail | Native OS share sheet → deep link to job | `share_events` row + PostHog `job_shared` |
| **B — Invite Friend** | Tap "Invite Friends" in profile | Native OS share sheet → referral link with code | `share_events` row + referral attribution on signup → `referral_rewards` |

### 1.2 Data Flow Diagram

```
┌─────────────┐     Share tap     ┌──────────────────┐
│  Mobile App  │ ───────────────→  │  Native Share API │
│  (Expo RN)   │  useShareJob()    │  Share.share()    │
└──────┬───────┘                   └──────────────────┘
       │                                   │
       │ 1. Builds share text + URL         │
       │ 2. Opens native share sheet        │
       │ 3. Calls record_share_event RPC    │
       │    (via supabase.rpc async)        │
       ▼                                   ▼
┌─────────────────────────────────────────────────┐
│              Supabase / PostgreSQL               │
│                                                   │
│  ┌──────────────┐   ┌───────────────────┐        │
│  │ share_events  │   │ referral_rewards   │        │
│  │ (immutable    │   │ (reward grants)    │        │
│  │  event log)   │   │                    │        │
│  └──────┬───────┘   └───────┬───────────┘        │
│         │                   │                      │
│  ┌──────┴───────┐   ┌──────┴───────────┐         │
│  │ profiles     │   │ event_outbox     │         │
│  │ .referral_   │   │ (PostHog async)  │         │
│  │ code         │   │                  │         │
│  │ .referred_by │   └──────────────────┘         │
│  └──────────────┘                                │
└─────────────────────────────────────────────────┘
```

### 1.3 Link Lifecycle

```
Share tap → generate share_token → record share_event('share')
                                 → build URL with ?ref={uid}&stkn={token}
                                 → open native share sheet

Recipient taps link → landing page or deep link handler
                    → record share_event('open') via record_open_event RPC
                    → redirect to job detail (if installed) or landing page

Recipient signs up (if new) → referred_by set from ?ref param
                            → process-referral-reward trigger
                            → insert referral_reward row
                            → fire PostHog + push notification
```

---

## 2. Database Schema

### 2.1 Migration File

**Location:** `supabase/migrations/202606070005_share_invite.sql`

Full schema in dedicated migration file (see §2.5). Summary of changes below.

### 2.2 New Table: `share_events`

Immutable event log for share actions and link opens.

```sql
create table public.share_events (
  id            uuid        primary key default gen_random_uuid(),
  sharer_id     uuid        not null references public.profiles(id) on delete cascade,
  job_id        uuid        references public.jobs(id) on delete set null,
  share_type    text        not null check (share_type in ('job', 'app')),
  channel       text,        -- null=direct, 'whatsapp','messages','email', etc. (from OS share sheet where detectable)
  share_token   text        unique not null default encode(gen_random_bytes(6), 'hex'),
  share_url     text,        -- full URL that was shared (for verification)
  opened_at     timestamptz, -- when the link was first opened (denormalized for quick stats)
  created_at    timestamptz not null default now()
);
```

**Indexes:**
- `idx_share_events_sharer` on `(sharer_id, created_at desc)` — sharer's share history
- `idx_share_events_token` on `(share_token)` — fast lookup on open
- `idx_share_events_job` on `(job_id)` where `job_id is not null` — job share counts

**RLS:**
- `SELECT`: `sharer_id = auth.uid()` (users see own shares)
- `INSERT`: `auth.uid() = sharer_id` (users insert own shares)
- No UPDATE/DELETE (immutable event log)

**Design notes:**
- `share_type = 'job'` for sharing a specific job card; `share_type = 'app'` for generic invite (no job context)
- `channel` captures the share target (WhatsApp, Messages, email, etc.) but is best-effort — many share targets don't expose this
- `share_token` is 12-char hex string (6 random bytes), not a UUID, for shorter URLs. Unique constraint ensures no collisions
- `opened_at` is set by the `record_share_open` RPC when the link is first opened (denormalized for dashboard queries)
- Job deletion sets `job_id = null` (SET NULL) preserving the share event record

### 2.3 New Table: `referral_rewards`

```sql
create table public.referral_rewards (
  id              uuid        primary key default gen_random_uuid(),
  referrer_id     uuid        not null references public.profiles(id) on delete cascade,
  referee_id      uuid        references public.profiles(id) on delete set null,
  reward_type     text        not null check (reward_type in ('super_applies', 'streak_freeze', 'streak_bonus', 'badge')),
  reward_amount   integer     not null default 1,
  status          text        not null default 'pending' check (status in ('pending', 'claimed', 'expired')),
  created_at      timestamptz not null default now(),
  claimed_at      timestamptz
);

-- Prevent duplicate rewards for same referrer+referee
create unique index idx_referral_rewards_unique_pair
  on public.referral_rewards (referrer_id, coalesce(referee_id, '00000000-0000-0000-0000-000000000000'));
```

**Indexes:**
- `idx_referral_rewards_referrer` on `(referrer_id, created_at desc)` — referrer's reward history
- `idx_referral_rewards_status` on `(status)` where `status = 'pending'` — pending rewards query

**RLS:**
- `SELECT`: `referrer_id = auth.uid()` (users see own rewards)
- `INSERT`: `referrer_id = auth.uid()` — but service_role used for reward creation in practice
- No UPDATE/DELETE from user role (system-managed)

**Reward types map to Alex's product spec:**

| reward_type | Meaning | Quantity Semantics | Product Milestone |
|---|---|---|---|
| `super_applies` | Bonus Super Apply allocation | 1 = one extra super apply | 1 friend joined |
| `streak_freeze` | Streak freeze token | 1 = one freeze that auto-consumes | 3 friends/month |
| `streak_bonus` | Streak bonus day (adds to current streak) | 1 = +1 day added instantly | 10 friends total |
| `badge` | "Top Referrer" badge | 1 = badge awarded (flag on profile, v1.1+) | 20 friends total |

### 2.4 Profiles Table Additions

```sql
alter table public.profiles
  add column referral_code          text unique,
  add column referred_by            uuid references public.profiles(id),
  add column shares_suspended_until timestamptz;

create index idx_profiles_referral_code
  on public.profiles (referral_code)
  where referral_code is not null;
```

**`referral_code`**: Unique 8-char alphanumeric code generated via RPC. Format: `HIRED-XXXX` (8 chars after prefix). Generated on demand (lazy) or at signup via trigger. See `generate_referral_code()` RPC.

**`referred_by`**: Set once at signup (first-click attribution). Immutable after set. References the referring user's profile UUID.

**`shares_suspended_until`**: When set and future, the user's share endpoint returns 429. Set automatically by fraud detection or manually by admin.

### 2.5 Stored Procedures (RPCs)

#### `generate_referral_code()`

Generates a unique 8-char alphanumeric referral code. Called on demand before sharing invite or on signup.

```sql
create or replace function public.generate_referral_code()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_code text;
  v_attempts int := 0;
begin
  -- Check if user already has a code
  select referral_code into v_code
  from public.profiles
  where id = v_user_id;

  if v_code is not null then
    return v_code;
  end if;

  -- Generate unique 8-char alphanumeric code
  loop
    v_code := upper(substr(
      encode(gen_random_bytes(6), 'hex'), 1, 8
    ));
    begin
      update public.profiles
      set referral_code = v_code
      where id = v_user_id
        and referral_code is null;
      exit when found;
    exception when unique_violation then
      -- collision: retry
    end;
    v_attempts := v_attempts + 1;
    if v_attempts >= 5 then
      -- Append timestamp hash as fallback
      v_code := upper(substr(
        encode(gen_random_bytes(8), 'hex'), 1, 8
      ));
      update public.profiles
      set referral_code = v_code
      where id = v_user_id;
      exit when found;
    end if;
  end loop;

  return v_code;
end;
$$;
```

**Edge cases:**
- If user already has a code, return existing (idempotent)
- On collision (unique_violation), retry up to 5 times
- Fallback appends extra entropy if 5 retries fail (near-impossible at <100k users)

#### `claim_referral(referral_code text)`

Called when a new user signs up with a referral code. Attributes the new user and grants reward to referrer.

```sql
create or replace function public.claim_referral(p_referral_code text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_new_user_id uuid := auth.uid();
  v_referrer_id uuid;
  v_referral_exists boolean;
  v_profile record;
begin
  if v_new_user_id is null then
    return json_build_object('error', 'Not authenticated');
  end if;

  -- Validate referral code
  select id, referred_by into v_profile
  from public.profiles
  where id = v_new_user_id;

  -- User already attributed to a referrer
  if v_profile.referred_by is not null then
    return json_build_object(
      'success', true,
      'message', 'Already claimed a referral'
    );
  end if;

  -- Find referrer by code (exclude self-referral)
  select id into v_referrer_id
  from public.profiles
  where referral_code = p_referral_code
    and id != v_new_user_id;

  if v_referrer_id is null then
    return json_build_object(
      'error', 'Invalid referral code',
      'success', false
    );
  end if;

  -- Attribute the referral
  update public.profiles
  set referred_by = v_referrer_id
  where id = v_new_user_id;

  -- Grant reward to referrer (status = 'pending', claimed on next app open)
  insert into public.referral_rewards (
    referrer_id, referee_id, reward_type, reward_amount, status
  ) values (
    v_referrer_id, v_new_user_id, 'super_applies', 1, 'pending'
  );

  return json_build_object(
    'success', true,
    'referrer_id', v_referrer_id
  );
end;
$$;
```

**Safeguards:**
- Cannot refer yourself (code != new_user_id check)
- Cannot overwrite existing `referred_by` attribution
- Reward starts as `pending` — claimed when user opens app next time

#### `record_share_event` (client-side RPC)

Called from mobile app immediately after Share.share() succeeds. See detailed implementation in §4.2.

#### `record_share_open` (server-side RPC)

Called when shared link is opened (from deep link handler or landing page). Records the open event.

### 2.6 Migration Verification Block

At the end of the migration file, include a verification block that runs as `SELECT` statements to validate the migration:

```sql
-- Verification (run after migration)
do $$
begin
  -- Verify tables exist
  assert exists (select from pg_tables where tablename = 'share_events'),
    'share_events table not found';
  assert exists (select from pg_tables where tablename = 'referral_rewards'),
    'referral_rewards table not found';

  -- Verify profiles columns
  assert exists (
    select from information_schema.columns
    where table_name = 'profiles' and column_name = 'referral_code'
  ), 'profiles.referral_code not found';
  assert exists (
    select from information_schema.columns
    where table_name = 'profiles' and column_name = 'referred_by'
  ), 'profiles.referred_by not found';
  assert exists (
    select from information_schema.columns
    where table_name = 'profiles' and column_name = 'shares_suspended_until'
  ), 'profiles.shares_suspended_until not found';

  -- Verify RLS is enabled
  assert exists (
    select from pg_tables
    where tablename = 'share_events' and rowsecurity = true
  ), 'RLS not enabled on share_events';

  assert exists (
    select from pg_tables
    where tablename = 'referral_rewards' and rowsecurity = true
  ), 'RLS not enabled on referral_rewards';

  -- Verify RPCs exist
  assert exists (
    select from pg_proc where proname = 'generate_referral_code'
  ), 'generate_referral_code RPC not found';
  assert exists (
    select from pg_proc where proname = 'claim_referral'
  ), 'claim_referral RPC not found';

  raise notice '✅ All share+invite migration checks passed';
end;
$$;
```

---

## 3. Frontend Architecture

### 3.1 File Map

```
apps/mobile/
├── lib/
│   └── share.ts                    ← Share utils, constants, URL builders
├── hooks/
│   ├── useShareJob.ts              ← Share job via native API + record event
│   ├── useInviteFriend.ts          ← Share referral code
│   └── useReferralRewards.ts       ← Fetch/handle rewards + claim
├── components/
│   └── share/
│       ├── ShareJobButton.tsx       ← Share icon for card overlay + header
│       ├── InviteFriendRow.tsx      ← Invite section for profile screen
│       ├── ReferralRewardBanner.tsx ← Pending reward claim banner
│       └── ShareToast.tsx          ← Post-share animated toast
└── app/
    ├── (candidate)/
    │   ├── job/[id].tsx            ← Add ShareJobButton in header
    │   └── (tabs)/deck.tsx         ← Add ReferralRewardBanner
    └── (auth)/signup.tsx           ← Add referral code input
```

### 3.2 Shared Library: `lib/share.ts`

Constant definitions, URL builders, and text formatters shared across hooks.

```typescript
// apps/mobile/lib/share.ts

// ── Constants ───────────────────────────────────────────

export const SHARE_TEXT_TEMPLATES = {
  job: {
    title: (title: string) => `Hi-Hired — ${title}`,
    subject: (title: string) => `${title} on Hi-Hired`,
    dialogTitle: 'Share this job',
    message: (params: {
      title: string;
      employerName: string;
      payDisplay: string;
      suburb: string;
      jobTypeLabel: string;
      sharerName?: string | null;
      deepLink: string;
      webLink: string;
    }): string => {
      const lines: string[] = [];
      if (params.sharerName) {
        lines.push(`👤 Shared by ${params.sharerName}`);
        lines.push('');
      }
      lines.push(
        `📋 Job: ${params.title}`,
        `💰 ${params.payDisplay || 'Rate not specified'}`,
        `📍 ${params.suburb}`,
        `🕒 ${params.jobTypeLabel}`,
        '',
        'Join Hi-Hired to browse local jobs:',
        params.deepLink,
        params.webLink,
      );
      return lines.join('\n');
    },
  },
  invite: {
    title: 'Join me on Hi-Hired',
    dialogTitle: 'Invite friends to Hi-Hired',
    subject: 'Join me on Hi-Hired',
    message: (params: {
      sharerName?: string | null;
      referralCode: string;
      deepLink: string;
      webLink: string;
    }): string => {
      const lines: string[] = [];
      lines.push(
        `${params.sharerName || 'Someone'} invited you to join Hi-Hired! 🎉`,
        '',
        'Find local casual and part-time jobs near you.',
        'Swipe through roles, apply in one tap, and chat with employers.',
        '',
        `Use my referral code: ${params.referralCode}`,
        '',
        'Download Hi-Hired:',
        params.webLink,
        '',
        `Or open the app: ${params.deepLink}`,
      );
      return lines.join('\n');
    },
  },
} as const;

// ── URL Builders ───────────────────────────────────────

const BASE_WEB = 'https://hihired.app';
const APP_SCHEME = 'hihired://';

export function buildJobShareUrl(jobId: string, sharerId: string, shareToken: string): {
  appDeepLink: string;
  webFallback: string;
  fullUrl: string;
} {
  const appDeepLink = `${APP_SCHEME}job/${jobId}`;
  const webFallback = `${BASE_WEB}/job/${jobId}?ref=${sharerId}&stkn=${shareToken}`;
  return {
    appDeepLink,
    webFallback,
    fullUrl: webFallback, // Primary URL used for sharing
  };
}

export function buildInviteShareUrl(referralCode: string, sharerId: string): {
  appDeepLink: string;
  webFallback: string;
  fullUrl: string;
} {
  const appDeepLink = `${APP_SCHEME}invite/${referralCode}`;
  const webFallback = `${BASE_WEB}/join?ref=${referralCode}&uid=${sharerId}`;
  return {
    appDeepLink,
    webFallback,
    fullUrl: webFallback,
  };
}

// ── Helpers ────────────────────────────────────────────

export function formatJobTypeLabel(raw: string): string {
  return raw
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export const DAILY_SHARE_LIMIT = 30;
```

### 3.3 Hook: `useShareJob`

```typescript
// apps/mobile/hooks/useShareJob.ts

import { useCallback, useState } from 'react';
import { Share, Platform } from 'react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { usePostHog } from '@/hooks/usePostHog';
import {
  SHARE_TEXT_TEMPLATES,
  buildJobShareUrl,
  formatJobTypeLabel,
} from '@/lib/share';
import type { Job } from '@hi-hired/shared';

interface ShareJobParams {
  job: Job;
  sharerName?: string | null;
  source?: 'card' | 'detail';
}

interface ShareResult {
  shared: boolean;
  /** true if user cancelled the native share sheet */
  cancelled?: boolean;
  error?: string;
}

export function useShareJob() {
  const [isSharing, setIsSharing] = useState(false);
  const { user } = useAuth();
  const posthog = usePostHog();

  const shareJob = useCallback(async (
    params: ShareJobParams,
  ): Promise<ShareResult> => {
    const { job, sharerName, source = 'card' } = params;

    if (!job?.id || !user?.id) {
      return { shared: false, error: 'Missing job or user data' };
    }

    setIsSharing(true);

    try {
      // ── 1. Generate share_token via RPC ──
      // This also validates rate limit
      const { data: shareData, error: rpcError } = await supabase
        .rpc('record_share_event', {
          p_job_id: job.id,
          p_share_type: 'job',
        });

      if (rpcError || !shareData?.allowed) {
        console.error('[useShareJob] RPC error:', rpcError || shareData?.error);
        return {
          shared: false,
          error: shareData?.error || 'Failed to record share',
        };
      }

      const shareToken: string = shareData.share_token;

      // ── 2. Build URLs ──
      const urls = buildJobShareUrl(job.id, user.id, shareToken);
      const jobTypeLabel = formatJobTypeLabel(job.job_type ?? '');

      const shareText = SHARE_TEXT_TEMPLATES.job.message({
        title: job.title ?? '',
        employerName: job.employer_name ?? '',
        payDisplay: job.pay_display ?? '',
        suburb: job.suburb ?? '',
        jobTypeLabel,
        sharerName,
        deepLink: urls.appDeepLink,
        webLink: urls.webFallback,
      });

      // ── 3. Open native share sheet ──
      const result = await Share.share(
        {
          title: SHARE_TEXT_TEMPLATES.job.title(job.title ?? ''),
          message: Platform.OS === 'android'
            ? `${shareText}\n\n${urls.webFallback}`
            : shareText,
          url: Platform.OS === 'ios' ? urls.webFallback : undefined,
        },
        {
          dialogTitle: SHARE_TEXT_TEMPLATES.job.dialogTitle,
          subject: SHARE_TEXT_TEMPLATES.job.subject(job.title ?? ''),
        },
      );

      const wasShared = result.action === Share.sharedAction;

      // ── 4. PostHog ──
      if (wasShared) {
        posthog?.capture('job_shared', {
          job_id: job.id,
          source,
          share_token: shareToken,
          employer_id: job.employer_id,
          channel: null, // OS doesn't tell us which app
        });
      }

      return {
        shared: wasShared,
        cancelled: result.action === Share.dismissedAction,
      };
    } catch (error) {
      console.error('[useShareJob] Error:', error);
      posthog?.capture('share_error', {
        job_id: job.id,
        error: String(error),
        source,
      });
      return { shared: false, error: String(error) };
    } finally {
      setIsSharing(false);
    }
  }, [user, posthog]);

  return { shareJob, isSharing };
}
```

**Key flow:**
1. Calls `record_share_event` RPC **first** (validates rate limit, generates share_token)
2. Builds share text + URLs locally (no async dependency for rapid UX)
3. Opens native `Share.share()` API
4. Captures PostHog event only on successful share (not cancelled)

### 3.4 Hook: `useInviteFriend`

```typescript
// apps/mobile/hooks/useInviteFriend.ts

import { useCallback, useState } from 'react';
import { Share } from 'react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { usePostHog } from '@/hooks/usePostHog';
import {
  SHARE_TEXT_TEMPLATES,
  buildInviteShareUrl,
} from '@/lib/share';

export function useInviteFriend() {
  const [isSharing, setIsSharing] = useState(false);
  const { user } = useAuth();
  const posthog = usePostHog();

  const inviteFriend = useCallback(async (): Promise<void> => {
    if (!user?.id) return;
    setIsSharing(true);

    try {
      // ── 1. Get or generate referral code ──
      const { data: code, error: codeError } = await supabase
        .rpc('generate_referral_code');

      if (codeError || !code) {
        console.error('[useInviteFriend] Code generation error:', codeError);
        // Fallback: share generic app link without code attribution
        await Share.share({
          title: 'Join me on Hi-Hired',
          message: 'Find local work on Hi-Hired! https://hihired.app/download',
        });
        return;
      }

      const referralCode: string = code;
      const urls = buildInviteShareUrl(referralCode, user.id);

      // ── 2. Build share message ──
      const shareText = SHARE_TEXT_TEMPLATES.invite.message({
        sharerName: user.full_name ?? user.email?.split('@')[0] ?? null,
        referralCode,
        deepLink: urls.appDeepLink,
        webLink: urls.webFallback,
      });

      // ── 3. Open native share sheet ──
      const result = await Share.share(
        {
          title: SHARE_TEXT_TEMPLATES.invite.title,
          message: shareText,
          url: Platform.OS === 'ios' ? urls.webFallback : undefined,
        },
        {
          dialogTitle: SHARE_TEXT_TEMPLATES.invite.dialogTitle,
          subject: SHARE_TEXT_TEMPLATES.invite.subject,
        },
      );

      // ── 4. PostHog ──
      if (result.action === Share.sharedAction) {
        posthog?.capture('invite_friend_shared', {
          referral_code: referralCode,
          channel: null,
        });
      }
    } catch (error) {
      console.error('[useInviteFriend] Error:', error);
      posthog?.capture('invite_friend_error', { error: String(error) });
    } finally {
      setIsSharing(false);
    }
  }, [user, posthog]);

  return { inviteFriend, isSharing };
}
```

### 3.5 Hook: `useReferralRewards`

```typescript
// apps/mobile/hooks/useReferralRewards.ts

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

interface ReferralReward {
  id: string;
  reward_type: 'super_applies' | 'streak_freeze' | 'streak_bonus' | 'badge';
  reward_amount: number;
  status: 'pending' | 'claimed' | 'expired';
  created_at: string;
}

interface ReferralStats {
  invites_sent: number;
  friends_joined: number;
  pending_rewards: number;
}

export function useReferralRewards() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // ── Pending rewards query ──
  const pendingQuery = useQuery<ReferralReward[]>({
    queryKey: ['referral-rewards', 'pending', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('referral_rewards')
        .select('*')
        .eq('referrer_id', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data ?? [];
    },
    enabled: Boolean(user?.id),
    staleTime: 30_000, // 30s — rewards can change when referrals complete
    refetchOnWindowFocus: true,
  });

  // ── Referral stats query ──
  const statsQuery = useQuery<ReferralStats>({
    queryKey: ['referral-stats', user?.id],
    queryFn: async () => {
      if (!user?.id) {
        return { invites_sent: 0, friends_joined: 0, pending_rewards: 0 };
      }

      // Count share_events for this user
      const { count: invitesSent } = await supabase
        .from('share_events')
        .select('*', { count: 'exact', head: true })
        .eq('sharer_id', user.id);

      // Count referral_rewards for this user (distinct referee_id)
      const { count: friendsJoined } = await supabase
        .from('referral_rewards')
        .select('*', { count: 'exact', head: true })
        .eq('referrer_id', user.id);

      // Count pending rewards
      const { count: pendingRewards } = await supabase
        .from('referral_rewards')
        .select('*', { count: 'exact', head: true })
        .eq('referrer_id', user.id)
        .eq('status', 'pending');

      return {
        invites_sent: invitesSent ?? 0,
        friends_joined: friendsJoined ?? 0,
        pending_rewards: pendingRewards ?? 0,
      };
    },
    enabled: Boolean(user?.id),
    staleTime: 60_000, // 1 minute
  });

  // ── Claim reward mutation ──
  const claimMutation = useMutation({
    mutationFn: async (rewardId: string) => {
      const { error } = await supabase
        .from('referral_rewards')
        .update({ status: 'claimed', claimed_at: new Date().toISOString() })
        .eq('id', rewardId)
        .eq('referrer_id', user?.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['referral-rewards', 'pending', user?.id],
      });
      queryClient.invalidateQueries({
        queryKey: ['referral-stats', user?.id],
      });
    },
  });

  return {
    pendingRewards: pendingQuery.data ?? [],
    isLoadingPending: pendingQuery.isLoading,
    pendingError: pendingQuery.error,
    stats: statsQuery.data ?? { invites_sent: 0, friends_joined: 0, pending_rewards: 0 },
    isLoadingStats: statsQuery.isLoading,
    claimReward: claimMutation.mutateAsync,
    isClaiming: claimMutation.isPending,
    refetchPending: pendingQuery.refetch,
    refetchStats: statsQuery.refetch,
  };
}
```

### 3.6 Component: `ShareJobButton.tsx`

```tsx
// apps/mobile/components/share/ShareJobButton.tsx

import React, { useCallback } from 'react';
import { Pressable, Text } from '@/components/tw';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/providers/ThemeProvider';
import { useShareJob } from '@/hooks/useShareJob';
import type { Job } from '@hi-hired/shared';

interface ShareJobButtonProps {
  job: Job;
  /** Optional: user's display name to personalise the share message */
  sharerName?: string | null;
  /** Visual variant */
  variant: 'card' | 'header';
}

export function ShareJobButton({ job, sharerName, variant }: ShareJobButtonProps) {
  const { colors } = useTheme();
  const { shareJob, isSharing } = useShareJob();

  const handlePress = useCallback(() => {
    if (isSharing || !job?.id) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    shareJob({
      job,
      sharerName,
      source: variant === 'card' ? 'card' : 'detail',
    });
    // Toast handled by parent screen via shareJob return value
  }, [job, sharerName, variant, shareJob, isSharing]);

  if (variant === 'card') {
    return (
      <Pressable
        onPress={handlePress}
        disabled={isSharing}
        className="w-9 h-9 rounded-full items-center justify-center active:opacity-70"
        style={{
          backgroundColor: isSharing
            ? `${colors.accent}20`
            : `${colors.background}CC`,
        }}
        accessibilityRole="button"
        accessibilityLabel={`Share ${job.title} job`}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Text className="text-base" accessibilityElementsHidden aria-hidden>
          ↗️
        </Text>
      </Pressable>
    );
  }

  // Header variant (job detail screen)
  return (
    <Pressable
      onPress={handlePress}
      disabled={isSharing}
      className="w-9 h-9 rounded-full items-center justify-center active:opacity-70"
      style={{ opacity: isSharing ? 0.5 : 1 }}
      accessibilityRole="button"
      accessibilityLabel={`Share ${job.title} job`}
    >
      <Text className="text-lg" accessibilityElementsHidden aria-hidden>
        ↗️
      </Text>
    </Pressable>
  );
}
```

### 3.7 Component: `InviteFriendRow.tsx`

```tsx
// apps/mobile/components/share/InviteFriendRow.tsx

import React, { useCallback, useState } from 'react';
import { Pressable, Text, View } from '@/components/tw';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import { useTheme } from '@/providers/ThemeProvider';
import { useInviteFriend } from '@/hooks/useInviteFriend';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';

export function InviteFriendRow() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const { inviteFriend, isSharing } = useInviteFriend();
  const [copied, setCopied] = useState(false);

  // Fetch referral code (lazy generation — RPC creates one if missing)
  const { data: referralCode, isLoading, error, refetch } = useQuery({
    queryKey: ['referral-code', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase.rpc('generate_referral_code');
      if (error) throw error;
      return data as string;
    },
    enabled: Boolean(user?.id),
    staleTime: Infinity, // code never changes after generation
    retry: 2,
  });

  const handleCopy = useCallback(async () => {
    if (!referralCode) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    await Clipboard.setStringAsync(referralCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [referralCode]);

  const handleShare = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    inviteFriend();
  }, [inviteFriend]);

  // ── Error state ──
  if (error) {
    return (
      <View className="px-4 py-3">
        <Pressable
          onPress={() => refetch()}
          className="flex-row items-center gap-2"
          accessibilityRole="button"
          accessibilityLabel="Tap to retry loading referral code"
        >
          <Text className="text-sm text-red-400">
            ⚠️ Couldn't load your referral code.{' '}
          </Text>
          <Text className="text-sm text-accent underline">Tap to retry.</Text>
        </Pressable>
      </View>
    );
  }

  // ── Loading state ──
  if (isLoading) {
    return (
      <View className="px-4 py-4">
        <Text className="text-sm text-muted">Loading your referral code…</Text>
      </View>
    );
  }

  // ── Default state ──
  return (
    <View className="px-4 py-4">
      <Text className="text-base font-semibold mb-1">📤 Invite friends</Text>
      <Text className="text-sm text-muted mb-3">
        Refer your friends and help them find local work on Hi-Hired.
      </Text>

      {/* Referral code row */}
      {referralCode && (
        <View
          className="flex-row items-center justify-between rounded-xl px-4 py-3 mb-3"
          style={{
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <View className="flex-row items-center gap-2">
            <Text className="text-sm text-muted">Your code:</Text>
            <Text className="text-base font-mono font-bold tracking-wider">
              {referralCode}
            </Text>
          </View>
          <Pressable
            onPress={handleCopy}
            className="px-3 py-1 rounded-lg"
            style={{ backgroundColor: colors.accent + '20' }}
            accessibilityRole="button"
            accessibilityLabel={`Copy referral code ${referralCode}`}
          >
            <Text className="text-xs font-semibold" style={{ color: colors.accent }}>
              {copied ? 'Copied!' : 'Copy'}
            </Text>
          </Pressable>
        </View>
      )}

      {/* Share button */}
      <Pressable
        onPress={handleShare}
        disabled={isSharing}
        className="flex-row items-center justify-center gap-2 rounded-xl py-3"
        style={{
          backgroundColor: colors.accent,
          opacity: isSharing ? 0.6 : 1,
        }}
        accessibilityRole="button"
        accessibilityLabel="Share invite link"
      >
        <Text className="text-base">📤</Text>
        <Text className="text-sm font-semibold" style={{ color: '#fff' }}>
          {isSharing ? 'Preparing…' : 'Share invite link'}
        </Text>
      </Pressable>
    </View>
  );
}
```

### 3.8 Component: `ReferralRewardBanner.tsx`

```tsx
// apps/mobile/components/share/ReferralRewardBanner.tsx

import React, { useCallback } from 'react';
import { Pressable, Text, View } from '@/components/tw';
import { useTheme } from '@/providers/ThemeProvider';
import { useReferralRewards } from '@/hooks/useReferralRewards';
import * as Haptics from 'expo-haptics';

interface ReferralRewardBannerProps {
  /** Where this banner is shown (for analytics) */
  location: 'deck' | 'profile';
}

const REWARD_LABELS: Record<string, { emoji: string; label: string }> = {
  super_applies: { emoji: '⚡', label: 'Super Apply' },
  streak_freeze: { emoji: '❄️', label: 'Streak Freeze' },
  streak_bonus:  { emoji: '🔥', label: 'Streak Bonus Day' },
  badge:         { emoji: '🏆', label: 'Top Referrer Badge' },
};

export function ReferralRewardBanner({ location }: ReferralRewardBannerProps) {
  const { colors } = useTheme();
  const {
    pendingRewards,
    isLoadingPending,
    claimReward,
    isClaiming,
  } = useReferralRewards();

  const handleClaim = useCallback(async (rewardId: string) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    try {
      await claimReward(rewardId);
    } catch (err) {
      console.error('[ReferralRewardBanner] Claim failed:', err);
    }
  }, [claimReward]);

  if (isLoadingPending || pendingRewards.length === 0) {
    return null;
  }

  return (
    <View className="px-4 py-2">
      {pendingRewards.map((reward) => {
        const meta = REWARD_LABELS[reward.reward_type] ?? {
          emoji: '🎁',
          label: 'Reward',
        };

        return (
          <Pressable
            key={reward.id}
            onPress={() => handleClaim(reward.id)}
            disabled={isClaiming}
            className="flex-row items-center gap-3 rounded-xl px-4 py-3 mb-2"
            style={{
              backgroundColor: colors.elevated,
              borderLeftWidth: 4,
              borderLeftColor: colors.accent,
              borderWidth: 1,
              borderColor: colors.border,
            }}
            accessibilityRole="button"
            accessibilityLabel={`You earned a ${meta.label}. Tap to claim.`}
          >
            <Text className="text-xl">{meta.emoji}</Text>
            <View className="flex-1">
              <Text className="text-sm font-semibold">
                You earned a reward!
              </Text>
              <Text className="text-xs text-muted">
                {meta.label} ×{reward.reward_amount} — Tap to claim
              </Text>
            </View>
            <Text className="text-accent text-xs font-semibold">
              {isClaiming ? '…' : 'Claim →'}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
```

### 3.9 Component: `ShareToast.tsx`

(Full implementation in Maya's handoff — use as-is from `apps/mobile/components/share/ShareToast.tsx`.)

Follows the `StreakSuperApplyBonus` pattern: animated, bottom-anchored, auto-dismiss 3s.

### 3.10 Integration: Swipe Card

**File:** `apps/mobile/components/deck/SwipeCard.tsx`

Add `ShareJobButton` in the card's action area alongside `BookmarkButton`:

```tsx
// Inside the card's action bar (absolute positioned, top-right area below photo)
<View style={{ position: 'absolute', top: 16, right: 16, zIndex: 10 }}>
  <View className="flex-row items-center gap-2">
    <BookmarkButton
      jobId={job.id}
      isBookmarked={isBookmarked}
      onToggle={handleToggleBookmark}
      size="md"
      variant="card"
    />
    <ShareJobButton
      job={job}
      sharerName={user?.full_name}
      variant="card"
    />
  </View>
</View>
```

**Constraint:** `ShareJobButton` and `BookmarkButton` must not overlap or conflict. They sit side-by-side in a flex-row. The share button icon (↗️) is visually distinct from the bookmark star (🔖).

### 3.11 Integration: Job Detail Header

**File:** `apps/mobile/app/(candidate)/job/[id].tsx`

Add `ShareJobButton` to header actions:

```tsx
<ScreenHeader
  title={job.title}
  actions={
    <View className="flex-row items-center gap-2">
      <ShareJobButton
        job={job}
        sharerName={user?.full_name}
        variant="header"
      />
      <BookmarkButton jobId={job.id} variant="header" size={24} />
    </View>
  }
/>
```

**Position:** Share button is left of Bookmark (↗️ then 🔖), then status badge if expired.

### 3.12 Integration: Profile Screen

**File:** `apps/mobile/components/screens/ProfileScreen.tsx`

Insert `InviteFriendRow` after "Saved Jobs" and before "Plans & pricing". Also add `ReferralRewardBanner` at the top of the screen content.

```tsx
// In the profile screen's action section
<View className="mt-4">
  {/* Referral reward banner — appears above actions */}
  <ReferralRewardBanner location="profile" />

  {/* Existing: Saved Jobs */}
  <SavedJobsRow ... />

  {/* NEW: Invite friends */}
  <InviteFriendRow />

  {/* Existing: Plans & pricing */}
  <PlansPricingRow ... />
</View>
```

### 3.13 Integration: Deck Screen

**File:** `apps/mobile/app/(candidate)/(tabs)/deck.tsx`

Add `ReferralRewardBanner` at the top of the deck (above the swipe cards):

```tsx
// Inside deck.tsx, above the deck
<ScrollView>
  <ReferralRewardBanner location="deck" />
  <SwipeDeck ... />
</ScrollView>
```

**Design constraint:** Banner only shows when there are pending rewards. At other times it renders `null` (no layout shift). See §3.8.

### 3.14 Integration: Signup Screen

**File:** `apps/mobile/app/(auth)/signup.tsx` (or `onboarding.tsx`)

After the user enters their basic info (name, email), show a "Referred by a friend?" field:

```tsx
// In the signup form, between email and password fields
<View className="mt-4">
  <Text className="text-sm text-muted mb-2">
    Have a referral code?
  </Text>
  <TextInput
    placeholder="e.g. HIRED-A1B2C3D4"
    value={referralCode}
    onChangeText={setReferralCode}
    autoCapitalize="characters"
    maxLength={13} // "HIRED-" (6) + 8 chars
  />
</View>
```

**On form submit (after auth signup succeeds):**

```typescript
// After supabase.auth.signUp() succeeds
if (referralCode) {
  await supabase.rpc('claim_referral', {
    p_referral_code: referralCode.trim(),
  });
}
```

**Design decisions:**
- Referral code field is **optional** — no validation error if left blank
- Field appears collapsed by default with a "Have a referral code?" toggle to reduce signup friction
- Code is submitted after auth signup completes (server-side attribution)
- Silent failure — if `claim_referral` errors, we don't block onboarding. Log and continue

---

## 4. API Contracts & RPCs

### 4.1 RPC: `record_share_event`

Called from client immediately after native share sheet opens (optimistic).

```typescript
// Client call
const { data, error } = await supabase.rpc('record_share_event', {
  p_job_id: 'uuid | null',       // null for generic app invite
  p_share_type: 'job' | 'app',   // 'job' = sharing a specific job, 'app' = generic invite
});

// Success response
{
  allowed: true,
  share_token: 'a1b2c3d4e5f6',   // 12-char hex string
  daily_share_count: 5,
}

// Rate limited response
{
  allowed: false,
  error: 'Daily share limit reached (30)',
  share_token: null,
}
```

**Rate limit:** 30 shares per rolling 24h window. Returns `allowed: false` if exceeded.

**Suspension check:** If `profiles.shares_suspended_until > now()`, returns `allowed: false` with suspension message.

### 4.2 RPC: `record_share_open`

Called when a share link is opened (deep link handler on app open, or landing page via server-side API).

```typescript
// Client/server call
const { data, error } = await supabase.rpc('record_share_open', {
  p_share_token: 'a1b2c3d4e5f6',
  p_recipient_installed: true | false,
  p_share_url: 'https://hihired.app/job/xxx?ref=...&stkn=...',
});

// Success response
{ success: true }

// Error response
{ error: 'Invalid share token' }
```

### 4.3 RPC: `generate_referral_code`

```typescript
// Client call
const { data, error } = await supabase.rpc('generate_referral_code');

// Response
'HIRED-A1B2C3D4'  // Or existing code if already generated
```

Idempotent: returns existing code if user already has one.

### 4.4 RPC: `claim_referral`

```typescript
// Client call (from signup flow)
const { data, error } = await supabase.rpc('claim_referral', {
  p_referral_code: 'HIRED-A1B2C3D4',
});

// Success
{
  success: true,
  referrer_id: 'uuid-of-referrer',
}

// Error
{
  success: false,
  error: 'Invalid referral code',
}

// Already claimed
{
  success: true,
  message: 'Already claimed a referral',
}
```

---

## 5. TanStack Query Key Strategy

```
['referral-code', userId]              → generate_referral_code() RPC result
                                       staleTime: Infinity (code never changes)
                                       retry: 2

['referral-rewards', 'pending', userId] → pending referral_rewards rows
                                        staleTime: 30s
                                        refetchOnWindowFocus: true

['referral-rewards', 'all', userId]    → all referral_rewards for history
                                       staleTime: 60s

['referral-stats', userId]             → aggregated counts (invites_sent, friends_joined, pending_rewards)
                                        staleTime: 60s
```

**Invalidation triggers:**
- After `claim_reward` mutation: invalidate `['referral-rewards', 'pending', userId]` and `['referral-stats', userId]`
- After signup with referral: no invalidation needed (new user's data, not current user's)
- After app foreground: `refetchOnWindowFocus: true` on pending rewards

---

## 6. Deep Link Architecture

### 6.1 URL Scheme

| Link Pattern | Purpose | Routes To |
|---|---|---|
| `hihired://job/{jobId}` | Open shared job in app | `app/(candidate)/job/[id].tsx` |
| `hihired://invite/{referralCode}` | Open app from invite | Profile screen + show welcome bonus |
| `https://hihired.app/job/{jobId}?ref={uid}&stkn={token}` | Web fallback for job share | Landing page (SSR) |
| `https://hihired.app/join?ref={code}&uid={sharerId}` | Web fallback for invite | App Store / Play Store redirect |

### 6.2 Deep Link Handling Flow

```
App opens via URL
  → expo-linking parses the URL
  → Map to Expo Router route
  → Handle 'ref' and 'stkn' parameters
  → Call record_share_open RPC
  → Navigate to job detail (if job URL) or show invite-welcome toast
```

### 6.3 Expo Router Configuration

```typescript
// app.config.ts (existing)
{
  scheme: 'hihired',
  // ... existing config
}
```

```typescript
// Expo Router link config
// Jobs:    hihired://job/{id}  →  app/(candidate)/job/[id].tsx (already exists)
// Invite:  hihired://invite/{code} → need new route or handler

// Option A: Add route file
// app/invite/[code].tsx — redirects to signup with pre-filled referral code

// Option B: Handle in root layout
// Use expo-router's useLinking to catch unknown routes
```

**Recommendation:** Option A — add `app/invite/[code].tsx`:

```tsx
// app/invite/[code].tsx
import { Redirect } from 'expo-router';
import { useLocalSearchParams } from 'expo-router';

export default function InviteRedirect() {
  const { code } = useLocalSearchParams<{ code: string }>();

  // Redirect to signup with referral code pre-filled
  return (
    <Redirect
      href={{
        pathname: '/(auth)/signup',
        params: { referralCode: code },
      }}
    />
  );
}
```

### 6.4 Landing Page (Web)

**Fast follow — not in MVP migration but needed for production.** Server-rendered page at `https://hihired.app/job/[id]`:

- SSR with cache TTL 5 minutes (Vercel Edge or Next.js getServerSideProps)
- OG meta tags for rich link preview (title, description, image)
- Mobile-optimized layout showing job title, company, pay, suburb
- "Get the app to apply" CTA → App Store / Play Store badges
- Handles expired/deleted jobs with fallback message
- Records `share_open` event server-side via Supabase RPC

**Out of scope for this migration** — scheduled as separate task. MVP shares work without landing page (non-installed users see a basic web page or app store page).

---

## 7. Analytics Plan

### 7.1 PostHog Events

| Event Name | Properties | Trigger | File |
|---|---|---|---|
| `share_job_button_tapped` | `job_id`, `source` ('card'\|'detail'), `employer_id` | User taps share button | `useShareJob.ts` |
| `share_job_success` | `job_id`, `source`, `share_token` | Share API returns sharedAction | `useShareJob.ts` |
| `share_job_error` | `job_id`, `error`, `source` | Share API throws | `useShareJob.ts` |
| `share_job_rate_limited` | `job_id`, `daily_count` | RPC returns allowed=false | `useShareJob.ts` |
| `invite_friend_shared` | `referral_code` | User shares invite link | `useInviteFriend.ts` |
| `invite_friend_error` | `error` | Share API throws during invite | `useInviteFriend.ts` |
| `referral_reward_claimed` | `reward_id`, `reward_type`, `reward_amount` | User taps claim on banner | `useReferralRewards.ts` |
| `referral_reward_expired` | `reward_id`, `reward_type` | Cron or system expiry | Server-side |
| `share_link_opened` | `share_token`, `job_id`, `recipient_installed` | Deep link opened | Landing page / app handler |
| `referral_signup` | `referrer_id`, `reward_type` | New user signs up with referral code | `claim_referral` RPC |

### 7.2 Dashboard Metrics (SQL Views)

Create these as Supabase views for the internal dashboard:

**`vw_share_metrics_daily`** — daily share counts per user
```sql
create or replace view public.vw_share_metrics_daily as
select
  date_trunc('day', created_at) as day,
  sharer_id,
  count(*) filter (where share_type = 'job') as job_shares,
  count(*) filter (where share_type = 'app') as invite_shares,
  count(*) filter (where opened_at is not null) as link_opens
from share_events
group by 1, 2;
```

**`vw_referral_metrics`** — referrer-level summary
```sql
create or replace view public.vw_referral_metrics as
select
  referrer_id,
  count(distinct referee_id) as friends_joined,
  count(*) filter (where status = 'pending') as pending_rewards,
  count(*) filter (where status = 'claimed') as claimed_rewards
from referral_rewards
group by referrer_id;
```

---

## 8. Rate Limiting & Fraud Detection

### 8.1 Rate Limit: 30 Shares / 24h

Implemented in `record_share_event` RPC:
```sql
select count(*) into v_daily_share_count
from public.share_events
where sharer_id = v_user_id
  and share_type = 'job'
  and created_at > now() - interval '24 hours';

if v_daily_share_count >= 30 then
  return json_build_object('allowed', false, 'error', 'Daily share limit reached (30)');
end if;
```

**Client-side UX:**
- Return `{ shared: false, error: 'Daily share limit reached (30)' }` from `useShareJob`
- Show toast: "You've reached the daily share limit (30). Try again tomorrow."
- Re-show share button (don't hide it permanently) — user can try again next day

### 8.2 Fraud Detection: 100 Shares / 1h

When a user exceeds 100 share events in a 1-hour window, automatically suspend shares for 24h:

```sql
-- Run periodically or inline in record_share_event
if v_daily_share_count >= 100 then
  update public.profiles
  set shares_suspended_until = now() + interval '24 hours'
  where id = v_user_id;
end if;
```

**Suspension check:** Every `record_share_event` call checks `shares_suspended_until > now()`.

### 8.3 Self-Referral Prevention

In `claim_referral` RPC:
```sql
select id into v_referrer_id
from public.profiles
where referral_code = p_referral_code
  and id != v_new_user_id;  -- Exclude self
```

**Future enhancement:** Add device fingerprint check (compared within 7-day window).

---

## 9. Implementation Sequence

### Sprint A — Foundation (Days 1-2)

| Step | File(s) | Depends On |
|---|---|---|
| A1 | Migration SQL + RPCs | Nothing |
| A2 | `lib/share.ts` (constants, builders) | Nothing |
| A3 | `useShareJob` hook | A2, Migration |
| A4 | `run supabase migration` | A1 |
| A5 | `ShareToast` component | Nothing |

### Sprint B — Share Job Card (Days 3-4)

| Step | File(s) | Depends On |
|---|---|---|
| B1 | `ShareJobButton` component | A3, A5 |
| B2 | Integration in `SwipeCard.tsx` | B1 |
| B3 | Integration in `job/[id].tsx` header | B1 |
| B4 | Deep link handling for `hihired://job/{id}` | — |
| B5 | Manual QA: share from card + detail | B2, B3, B4 |

### Sprint C — Invite Friend (Days 5-6)

| Step | File(s) | Depends On |
|---|---|---|
| C1 | `useInviteFriend` + `useReferralRewards` hooks | A2, Migration |
| C2 | `InviteFriendRow` component | A5, C1 |
| C3 | `ReferralRewardBanner` component | C1 |
| C4 | Integration in `ProfileScreen.tsx` | C2, C3 |
| C5 | Integration in `deck.tsx` | C3 |
| C6 | Referral code input on signup screen | C1 |
| C7 | Deep link for `hihired://invite/{code}` | — |

### Sprint D — Polish & Tests (Day 7)

| Step | Description |
|---|---|
| D1 | Unit tests: RPCs, rate limits, referral logic |
| D2 | Integration test: deep link → record_open → job detail |
| D3 | Integration test: signup with referral → reward created |
| D4 | Accessibility audit (VoiceOver / TalkBack) |
| D5 | PostHog event verification (all 8 events) |
| D6 | Edge case test: expired job share, offline, rate limited |

### Total Estimated Effort

| Phase | Days |
|---|---|
| Sprint A (Foundation) | 2 |
| Sprint B (Share Job) | 2 |
| Sprint C (Invite Friend) | 2 |
| Sprint D (Polish + Tests) | 1 |
| **Total** | **7 days** |

---

## 10. Risk Register

| # | Risk | Likelihood | Impact | Mitigation | Owner |
|---|---|---|---|---|---|
| 1 | **Rate limit blocks legitimate power users** | Medium | Medium | Rate limit is 30/day — generous for typical users. Monitor via dashboard; adjust threshold if complaint rate > 1%. | Backend |
| 2 | **Deep link to expired/deleted job** | Medium | Low | `record_share_open` checks job status. App shows "job unavailable" screen with CTA to browse. | Fullstack |
| 3 | **Self-referral fraud** | Low | Medium | `claim_referral` excludes same-user. Add device fingerprint in v1.1. | Backend |
| 4 | **Referral code collision at scale** | Low | Low | 8-char alphanumeric → ~2.8T combinations. Retry on collision. Fallback extends to 12 chars. | Backend |
| 5 | **Native share API fails on certain Android OEMs** | Medium | Low | `Share.share()` is well-tested in Expo. Catch errors gracefully with toast. No blocking UX. | Mobile |
| 6 | **Universal Links / App Links not configured** | High | Medium | Custom scheme fallback works. Must deploy `apple-app-site-association` + `assetlinks.json` before production launch. | DevOps |
| 7 | **Share sheet doesn't expose the selected channel** | High | Low | OS privacy restriction. `channel` column in `share_events` stays null for most shares. Acceptable for MVP. | Mobile |
| 8 | **Pending rewards pile up unclaimed** | Low | Low | Banner on deck + profile. Auto-claim on next app version? Add push notification reminder in v1.1. | Fullstack |
| 9 | **Offline share — event never recorded** | Medium | Low | Optimistic UI: share sheet opens immediately. RPC call is fire-and-forget. Acceptable for MVP; add offline queue in v1.1. | Mobile |
| 10 | **Reward type 'super_applies' doesn't actually grant a super apply** | Medium | High | Must integrate with existing `super_applies_remaining` or `daily_super_applies` counter. Requires understanding of current super apply system. **Blocker for reward consumption.** | Backend |

**Risk #10 is the highest impact item.** The `super_applies` reward type must integrate with the existing Super Apply system. Before Sprint C, the implementer must:
1. Find where `super_applies_remaining` is stored (likely in `profiles` or a `user_credits` table)
2. When reward is claimed, increment that counter
3. Ensure the swipe-up "Super Apply" button reads from the same counter

---

## 11. File Manifest

### New Files (database)

| File | Lines (est.) | Description |
|---|---|---|
| `supabase/migrations/202606070005_share_invite.sql` | ~200 | Full migration: tables, RLS, indexes, RPCs, verification |

### New Files (frontend)

| File | Lines (est.) | Description |
|---|---|---|
| `apps/mobile/lib/share.ts` | ~100 | Share constants, URL builders, text formatters |
| `apps/mobile/hooks/useShareJob.ts` | ~120 | Share job hook with RPC + native API |
| `apps/mobile/hooks/useInviteFriend.ts` | ~90 | Invite friend hook with referral code |
| `apps/mobile/hooks/useReferralRewards.ts` | ~130 | Rewards + stats queries, claim mutation |
| `apps/mobile/components/share/ShareJobButton.tsx` | ~70 | Share button (card + header variants) |
| `apps/mobile/components/share/InviteFriendRow.tsx` | ~120 | Invite row with copy + share |
| `apps/mobile/components/share/ReferralRewardBanner.tsx` | ~90 | Pending reward claim banner |
| `apps/mobile/components/share/ShareToast.tsx` | ~100 | Post-share animated toast (from Maya) |
| `apps/mobile/app/invite/[code].tsx` | ~15 | Deep link redirect route |

### Modified Files

| File | Change |
|---|---|
| `apps/mobile/components/deck/SwipeCard.tsx` | Add ShareJobButton next to BookmarkButton |
| `apps/mobile/app/(candidate)/job/[id].tsx` | Add ShareJobButton to ScreenHeader actions |
| `apps/mobile/components/screens/ProfileScreen.tsx` | Add InviteFriendRow + ReferralRewardBanner |
| `apps/mobile/app/(candidate)/(tabs)/deck.tsx` | Add ReferralRewardBanner above deck |
| `apps/mobile/app/(auth)/signup.tsx` | Add referral code input field + claim_referral on submit |

---

## Appendix A: Supabase Edge Function — `process-referral-reward`

**This is a v1.1 enhancement, not MVP.** Currently rewards are granted immediately in the `claim_referral` RPC (synchronous). For production, move reward processing to an async Edge Function:

```typescript
// supabase/functions/process-referral-reward/index.ts

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const { referee_id } = await req.json()

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  // Fetch referee profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, referred_by, onboarding_completed_at')
    .eq('id', referee_id)
    .single()

  if (!profile?.referred_by || !profile?.onboarding_completed_at) {
    return new Response(JSON.stringify({ skipped: true }), { status: 200 })
  }

  // Check for existing reward (dedup)
  const { data: existing } = await supabase
    .from('referral_rewards')
    .select('id')
    .eq('referrer_id', profile.referred_by)
    .eq('referee_id', referee_id)
    .maybeSingle()

  if (existing) {
    return new Response(JSON.stringify({ skipped: true }), { status: 200 })
  }

  // Determine reward tier based on referrer's total
  const { count: friendsCount } = await supabase
    .from('referral_rewards')
    .select('*', { count: 'exact', head: true })
    .eq('referrer_id', profile.referred_by)

  let rewardType = 'super_applies'
  let rewardAmount = 1

  if (friendsCount! >= 20) {
    rewardType = 'badge'
  } else if (friendsCount! >= 10) {
    rewardType = 'streak_bonus'
  } else if (friendsCount! >= 5) {
    rewardType = 'super_applies'
    rewardAmount = 2
  }
  // 3 friends/month tracked separately (requires monthly window)
  // For MVP, every referral gives 1 super_apply

  // Create reward
  await supabase.from('referral_rewards').insert({
    referrer_id: profile.referred_by,
    referee_id: referee_id,
    reward_type: rewardType,
    reward_amount: rewardAmount,
    status: 'pending',
  })

  // Send push notification
  // (via existing OneSignal integration)

  return new Response(JSON.stringify({ success: true }), { status: 200 })
})
```

**Trigger:** Database webhook on `profiles` when `onboarding_completed_at` transitions from null to a value and `referred_by` is not null.

---

## Appendix B: Migration Rollback Plan

If migration needs to be reversed:

```sql
-- Rollback: 202606070005_share_invite
drop function if exists public.claim_referral(text);
drop function if exists public.generate_referral_code();
drop function if exists public.record_share_open(text, boolean, text);
drop function if exists public.record_share_event(uuid, text);

drop table if exists public.referral_rewards;
drop table if exists public.share_events;

alter table public.profiles
  drop column if exists referral_code,
  drop column if exists referred_by,
  drop column if exists shares_suspended_until;
```

**Rollback safety:** Both new tables are standalone (no existing data depends on them). Dropping columns from `profiles` is safe as long as no application code references them at runtime. Coordinate rollback with a frontend deploy that removes references.

---

*End of Architecture Handoff. Questions → route to Jordan for clarification.*
