-- Migration: 202606070005_share_invite
-- Description: Add share_events and referral_rewards tables,
--              profile columns for referral tracking, RPCs, RLS, indexes.
--
-- Features:
--   (A) Share Job Cards — track every share action and link open
--   (B) Invite Friend Referral — unique codes, attribution, rewards
--
-- Author: Jordan (Architecture)
-- Date:   2026-06-07

-- ════════════════════════════════════════════════════════════════
-- 1. PROFILES TABLE ADDITIONS
-- ════════════════════════════════════════════════════════════════

alter table public.profiles
  add column if not exists referral_code          text unique,
  add column if not exists referred_by            uuid references public.profiles(id),
  add column if not exists shares_suspended_until timestamptz;

create index if not exists idx_profiles_referral_code
  on public.profiles (referral_code)
  where referral_code is not null;


-- ════════════════════════════════════════════════════════════════
-- 2. SHARE EVENTS TABLE
-- ════════════════════════════════════════════════════════════════
-- Immutable event log. One row per share action (share_type='job' or 'app').
-- share_token is a 12-char hex string embedded in shared URLs.
-- opened_at is set by record_share_open() RPC when the link is first opened.

create table if not exists public.share_events (
  id            uuid        primary key default gen_random_uuid(),
  sharer_id     uuid        not null references public.profiles(id) on delete cascade,
  job_id        uuid        references public.jobs(id) on delete set null,
  share_type    text        not null check (share_type in ('job', 'app')),
  channel       text,        -- null=direct, 'whatsapp','messages','email', etc.
  share_token   text        unique not null default encode(gen_random_bytes(6), 'hex'),
  share_url     text,        -- full URL that was shared
  opened_at     timestamptz,
  created_at    timestamptz not null default now()
);

-- Indexes
create index if not exists idx_share_events_sharer
  on public.share_events (sharer_id, created_at desc);

create index if not exists idx_share_events_token
  on public.share_events (share_token);

create index if not exists idx_share_events_job
  on public.share_events (job_id)
  where job_id is not null;

create index if not exists idx_share_events_rate_limit
  on public.share_events (sharer_id, created_at)
  where share_type = 'job';

-- RLS
alter table public.share_events enable row level security;

create policy "share_events_select_own"
  on public.share_events for select
  using (sharer_id = auth.uid());

create policy "share_events_insert_own"
  on public.share_events for insert
  with check (sharer_id = auth.uid());

-- No update or delete — immutable event log


-- ════════════════════════════════════════════════════════════════
-- 3. REFERRAL REWARDS TABLE
-- ════════════════════════════════════════════════════════════════
-- Tracks reward grants. One row per reward, multiple per referrer.
-- Reward types map to Alex's product spec:
--   super_applies — +1 Super Apply allocation (1 friend joined)
--   streak_freeze — 1 streak freeze token (3 friends/month)
--   streak_bonus  — +1 day added to current streak (10 friends total)
--   badge         — "Top Referrer" badge (20 friends total, v1.1+)

create table if not exists public.referral_rewards (
  id              uuid        primary key default gen_random_uuid(),
  referrer_id     uuid        not null references public.profiles(id) on delete cascade,
  referee_id      uuid        references public.profiles(id) on delete set null,
  reward_type     text        not null check (reward_type in ('super_applies', 'streak_freeze', 'streak_bonus', 'badge')),
  reward_amount   integer     not null default 1,
  status          text        not null default 'pending' check (status in ('pending', 'claimed', 'expired')),
  created_at      timestamptz not null default now(),
  claimed_at      timestamptz
);

-- Indexes
create index if not exists idx_referral_rewards_referrer
  on public.referral_rewards (referrer_id, created_at desc);

create index if not exists idx_referral_rewards_pending
  on public.referral_rewards (status)
  where status = 'pending';

-- Unique constraint: prevent duplicate rewards for same referrer+referee pair
create unique index if not exists idx_referral_rewards_unique_pair
  on public.referral_rewards (referrer_id, coalesce(referee_id, '00000000-0000-0000-0000-000000000000'));

-- RLS
alter table public.referral_rewards enable row level security;

create policy "referral_rewards_select_own"
  on public.referral_rewards for select
  using (referrer_id = auth.uid());

-- Referrer can insert their own rewards
create policy "referral_rewards_insert_own"
  on public.referral_rewards for insert
  with check (referrer_id = auth.uid());

-- Users can claim their own pending rewards
create policy "referral_rewards_update_own"
  on public.referral_rewards for update
  using (referrer_id = auth.uid())
  with check (
    referrer_id = auth.uid()
    and status in ('pending', 'claimed')
  );


-- ════════════════════════════════════════════════════════════════
-- 4. STORED PROCEDURES (RPCs)
-- ════════════════════════════════════════════════════════════════

-- ── 4a. generate_referral_code ────────────────────────────────
-- Returns the user's existing code or generates a new unique 8-char code.
-- Idempotent: calling multiple times returns the same code.
-- Collision-safe: retries up to 5 times on unique_violation.

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
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  -- Already has a code
  select referral_code into v_code
  from public.profiles
  where id = v_user_id;

  if v_code is not null then
    return v_code;
  end if;

  -- Generate unique 8-char alphanumeric code
  loop
    v_code := upper(substr(encode(gen_random_bytes(6), 'hex'), 1, 8));
    begin
      update public.profiles
      set referral_code = v_code
      where id = v_user_id
        and referral_code is null;
      exit when found;
    exception when unique_violation then
      -- collision — retry
    end;

    v_attempts := v_attempts + 1;
    if v_attempts >= 5 then
      -- Fallback: longer code (extremely rare at < 100k users)
      v_code := upper(substr(encode(gen_random_bytes(8), 'hex'), 1, 12));
      update public.profiles
      set referral_code = v_code
      where id = v_user_id;
      exit when found;
    end if;
  end loop;

  return v_code;
end;
$$;


-- ── 4b. claim_referral ────────────────────────────────────────
-- Called when a new user signs up with a referral code.
-- Attributes the new user to the referrer and grants a pending reward.
-- Safeguards: no self-referral, no overwriting existing attribution.

create or replace function public.claim_referral(p_referral_code text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_new_user_id uuid := auth.uid();
  v_referrer_id uuid;
  v_profile record;
begin
  if v_new_user_id is null then
    return json_build_object('error', 'Not authenticated', 'success', false);
  end if;

  -- Get current user's profile
  select id, referred_by into v_profile
  from public.profiles
  where id = v_new_user_id;

  -- Already attributed
  if v_profile.referred_by is not null then
    return json_build_object('success', true, 'message', 'Already claimed a referral');
  end if;

  -- Validate code and exclude self-referral
  select id into v_referrer_id
  from public.profiles
  where referral_code = p_referral_code
    and id != v_new_user_id;

  if v_referrer_id is null then
    return json_build_object('error', 'Invalid referral code', 'success', false);
  end if;

  -- Attribute the referral
  update public.profiles
  set referred_by = v_referrer_id
  where id = v_new_user_id;

  -- Grant pending reward (claimed when user opens app next time)
  insert into public.referral_rewards (
    referrer_id, referee_id, reward_type, reward_amount, status
  ) values (
    v_referrer_id, v_new_user_id, 'super_applies', 1, 'pending'
  );

  return json_build_object('success', true, 'referrer_id', v_referrer_id);
end;
$$;


-- ── 4c. record_share_event ────────────────────────────────────
-- Called from mobile app before/after native share sheet opens.
-- Validates rate limit (30 shares / 24h rolling), checks suspension,
-- generates share_token, inserts share_event row, returns the token.

create or replace function public.record_share_event(
  p_job_id      uuid default null,
  p_share_type  text default 'job'
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id        uuid := auth.uid();
  v_share_token    text;
  v_daily_count    int;
  v_suspended_until timestamptz;
begin
  if v_user_id is null then
    return json_build_object('allowed', false, 'error', 'Not authenticated');
  end if;

  -- Validate share_type
  if p_share_type not in ('job', 'app') then
    return json_build_object('allowed', false, 'error', 'Invalid share_type');
  end if;

  -- ── Rate limit: 30 job shares / 24h rolling ──
  select count(*) into v_daily_count
  from public.share_events
  where sharer_id = v_user_id
    and share_type = 'job'
    and created_at > now() - interval '24 hours';

  if v_daily_count >= 30 then
    return json_build_object(
      'allowed', false,
      'error', 'Daily share limit reached (30)',
      'share_token', null,
      'daily_share_count', v_daily_count
    );
  end if;

  -- ── Suspension check ──
  select shares_suspended_until into v_suspended_until
  from public.profiles
  where id = v_user_id;

  if v_suspended_until is not null and v_suspended_until > now() then
    return json_build_object(
      'allowed', false,
      'error', 'Shares suspended until ' || v_suspended_until,
      'share_token', null,
      'daily_share_count', v_daily_count
    );
  end if;

  -- ── Generate share_token ──
  v_share_token := encode(gen_random_bytes(6), 'hex');

  -- ── Insert event ──
  insert into public.share_events (
    sharer_id, job_id, share_type, share_token
  ) values (
    v_user_id,
    case when p_share_type = 'job' then p_job_id else null end,
    p_share_type,
    v_share_token
  );

  return json_build_object(
    'allowed', true,
    'share_token', v_share_token,
    'daily_share_count', v_daily_count + 1
  );
end;
$$;


-- ── 4d. record_share_open ─────────────────────────────────────
-- Called when a shared link is opened (from deep link handler or landing page).
-- Finds the original share event by share_token and records the open.
-- Deduplicates: only updates opened_at if it was null (first open).

create or replace function public.record_share_open(
  p_share_token        text,
  p_recipient_installed boolean default false,
  p_share_url          text default null
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_share_id  uuid;
  v_sharer_id uuid;
  v_job_id    uuid;
  v_share_type text;
begin
  -- Find the original share event
  select id, sharer_id, job_id, share_type
  into v_share_id, v_sharer_id, v_job_id, v_share_type
  from public.share_events
  where share_token = p_share_token
  limit 1;

  if v_share_id is null then
    return json_build_object('error', 'Invalid share token');
  end if;

  -- Update opened_at only on first open
  update public.share_events
  set opened_at = coalesce(opened_at, now()),
      share_url = coalesce(share_url, p_share_url)
  where id = v_share_id;

  return json_build_object('success', true);
end;
$$;


-- ════════════════════════════════════════════════════════════════
-- 5. ANALYTICS VIEWS
-- ════════════════════════════════════════════════════════════════

create or replace view public.vw_share_metrics_daily as
select
  date_trunc('day', created_at)::date as day,
  sharer_id,
  count(*) filter (where share_type = 'job') as job_shares,
  count(*) filter (where share_type = 'app') as invite_shares,
  count(*) filter (where opened_at is not null) as link_opens
from public.share_events
group by 1, 2;

create or replace view public.vw_referral_metrics as
select
  referrer_id,
  count(distinct referee_id) as friends_joined,
  count(*) filter (where status = 'pending') as pending_rewards,
  count(*) filter (where status = 'claimed') as claimed_rewards
from public.referral_rewards
group by referrer_id;


-- ════════════════════════════════════════════════════════════════
-- 6. VERIFICATION BLOCK
-- ════════════════════════════════════════════════════════════════
-- Run manually:  select public.verify_share_invite_migration();
-- Raises an exception if any check fails.

create or replace function public.verify_share_invite_migration()
returns text
language plpgsql
as $$
begin
  -- Tables
  assert exists (select from pg_tables where tablename = 'share_events'),
    'FAIL: share_events table not found';
  assert exists (select from pg_tables where tablename = 'referral_rewards'),
    'FAIL: referral_rewards table not found';

  -- Profiles columns
  assert exists (
    select from information_schema.columns
    where table_name = 'profiles' and column_name = 'referral_code'
  ), 'FAIL: profiles.referral_code not found';

  assert exists (
    select from information_schema.columns
    where table_name = 'profiles' and column_name = 'referred_by'
  ), 'FAIL: profiles.referred_by not found';

  assert exists (
    select from information_schema.columns
    where table_name = 'profiles' and column_name = 'shares_suspended_until'
  ), 'FAIL: profiles.shares_suspended_until not found';

  -- RLS enabled
  assert exists (
    select from pg_tables
    where tablename = 'share_events' and rowsecurity = true
  ), 'FAIL: RLS not enabled on share_events';

  assert exists (
    select from pg_tables
    where tablename = 'referral_rewards' and rowsecurity = true
  ), 'FAIL: RLS not enabled on referral_rewards';

  -- RPCs exist
  assert exists (
    select from pg_proc where proname = 'generate_referral_code'
  ), 'FAIL: generate_referral_code RPC not found';

  assert exists (
    select from pg_proc where proname = 'claim_referral'
  ), 'FAIL: claim_referral RPC not found';

  assert exists (
    select from pg_proc where proname = 'record_share_event'
  ), 'FAIL: record_share_event RPC not found';

  assert exists (
    select from pg_proc where proname = 'record_share_open'
  ), 'FAIL: record_share_open RPC not found';

  return '✅ All share+invite migration checks passed';
end;
$$;
