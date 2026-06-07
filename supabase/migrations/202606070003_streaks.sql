-- Migration: Daily Streak System
-- Adds streaks table, RLS, indexes, triggers, and Edge Function support
-- See: /home/admin/swipe-job-search/plans/streak-jordan-handoff.md

-- ============================================================================
-- 1. STREAKS TABLE
-- ============================================================================

create table public.streaks (
  id              uuid        primary key default gen_random_uuid(),
  user_id         uuid        not null references public.profiles(id) on delete cascade unique,
  current_streak  integer     not null default 0,
  longest_streak  integer     not null default 0,
  last_swipe_date date,                              -- UTC date of last qualifying swipe session
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

comment on table public.streaks is 'Tracks daily swipe streaks for job seekers. One row per user.';
comment on column public.streaks.current_streak is 'Number of consecutive days with >=5 swipes. Resets to 0 on gap.';
comment on column public.streaks.longest_streak is 'All-time longest current_streak value. Monotonic.';
comment on column public.streaks.last_swipe_date is 'UTC date (not timestamp) of the user''s last qualifying swipe session.';

-- ============================================================================
-- 2. INDEXES
-- ============================================================================

-- For fast per-user lookups (the only access pattern for job-seekers themselves)
create index idx_streaks_user_id on public.streaks (user_id);

-- For the 22:00 AEDT cron: find streaks at risk for notification
create index idx_streaks_last_swipe_date on public.streaks (last_swipe_date);

-- Composite index for the at-risk query: swipe_date before today AND positive streak
create index idx_streaks_at_risk on public.streaks (last_swipe_date, current_streak)
  where current_streak >= 1;

-- ============================================================================
-- 3. UPDATED_AT TRIGGER
-- ============================================================================

create trigger streaks_updated_at
  before update on public.streaks
  for each row execute function public.set_updated_at();

-- ============================================================================
-- 4. ROW LEVEL SECURITY
-- ============================================================================

alter table public.streaks enable row level security;

-- Users can only see their own streak row
create policy "streaks_select_own"
  on public.streaks for select
  using (user_id = auth.uid());

-- Users can insert their own streak row (for on-boarding: first swipe creates it)
create policy "streaks_insert_own"
  on public.streaks for insert
  with check (user_id = auth.uid());

-- Users can update their own streak row
create policy "streaks_update_own"
  on public.streaks for update
  using (user_id = auth.uid());

-- Users can delete their own streak row (account removal use case)
create policy "streaks_delete_own"
  on public.streaks for delete
  using (user_id = auth.uid());

-- ============================================================================
-- 5. EDGE TRIGGER FUNCTION: update-streak
-- ============================================================================
--
-- Called by the `update-streak` Edge Function (not a DB trigger — see below).
-- This function handles the core streak upsert logic:
--   - New user (no existing row): insert with current_streak=1
--   - Consecutive day: increment current_streak, update longest_streak if needed
--   - Gap (missed >=1 day): reset current_streak to 1
--   - Same day (already counted): no-op
--
-- Designed to be idempotent and idempotent-safe for fire-and-forget calls.
--
-- ============================================================================

create or replace function public.upsert_streak(
  p_user_id        uuid,
  p_today_date     date   -- UTC date of the swipe session
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing      public.streaks%rowtype;
  v_new_streak    integer;
  v_new_longest   integer;
  v_result        jsonb;
begin
  -- Attempt to read existing streak row
  select * into v_existing
  from public.streaks
  where user_id = p_user_id;

  if not found then
    -- Brand new user: insert first streak row
    insert into public.streaks (user_id, current_streak, longest_streak, last_swipe_date)
    values (p_user_id, 1, 1, p_today_date)
    returning * into v_existing;

    v_result := jsonb_build_object(
      'action', 'created',
      'current_streak', 1,
      'longest_streak', 1,
      'last_swipe_date', p_today_date
    );

  elsif v_existing.last_swipe_date = p_today_date then
    -- Already recorded today: no-op (same session, same day)
    v_result := jsonb_build_object(
      'action', 'noop_same_day',
      'current_streak', v_existing.current_streak,
      'longest_streak', v_existing.longest_streak,
      'last_swipe_date', v_existing.last_swipe_date
    );

  elsif v_existing.last_swipe_date = (p_today_date - 1) then
    -- Consecutive day: increment
    v_new_streak := v_existing.current_streak + 1;
    v_new_longest := greatest(v_existing.longest_streak, v_new_streak);

    update public.streaks
    set current_streak = v_new_streak,
        longest_streak = v_new_longest,
        last_swipe_date = p_today_date
    where user_id = p_user_id;

    v_result := jsonb_build_object(
      'action', 'incremented',
      'current_streak', v_new_streak,
      'longest_streak', v_new_longest,
      'last_swipe_date', p_today_date
    );

  else
    -- Gap: last_swipe_date < (p_today_date - 1) — streak broken, reset to 1
    v_new_streak := 1;
    v_new_longest := greatest(v_existing.longest_streak, 1);

    update public.streaks
    set current_streak = 1,
        last_swipe_date = p_today_date
    where user_id = p_user_id;

    v_result := jsonb_build_object(
      'action', 'reset',
      'current_streak', 1,
      'longest_streak', v_new_longest,
      'last_swipe_date', p_today_date
    );
  end if;

  return v_result;
end;
$$;

-- Grant execute to authenticated users (called via Edge Function with service_role)
grant execute on function public.upsert_streak(uuid, date) to service_role;

-- ============================================================================
-- 6. (NOT A DB TRIGGER) — Edge Function trigger via HTTP
-- ============================================================================
--
-- The `update-streak` Edge Function is NOT a database trigger.
-- It is called via `supabase.functions.invoke('update-streak')` from the
-- frontend swipe handler (useSwipe hook) after each successful swipe INSERT.
--
-- Rationale:
--   a) Performance: A DB trigger on every swipe INSERT would add latency
--      to every swipe. We batch the streak check for >=5 swipes.
--   b) Decoupling: The streak logic only fires on the 5th swipe, not on
--      every swipe. This avoids unnecessary DB writes.
--   c) Fire-and-forget: The client doesn't wait for the streak response.
--
-- Trigger setup for `update-streak` is done in Supabase dashboard
-- or via the Edge Function itself. It is invoked via HTTP POST.
--
-- See docs/streak-jordan-handoff.md for full Edge Function contract.
--
-- ============================================================================

-- ============================================================================
-- 7. SWIPE DIRECTION ENUM EXTENSION (applied direction already exists)
-- ============================================================================
--
-- The `swipe_direction` enum already includes 'left' and 'right'.
-- The `applied` direction was added in migration 202606040001_add_applied_direction.sql.
-- Super-applies count as swipe events toward the streak threshold.
--
-- No changes needed to the swipes table — streak uses count(candidate_id)
-- where created_at::date = today, regardless of direction.
--
-- ============================================================================

-- ============================================================================
-- 8. SUPABASE CRON CONFIGURATION (via config.toml)
-- ============================================================================
--
-- Add to supabase/config.toml:
--
-- [functions.update-streak]
-- verify_jwt = false
--
-- [functions.streak-at-risk-check]
-- verify_jwt = false
-- [functions.streak-at-risk-check.cron]
-- schedule = "0 11 * * *"   -- 22:00 AEDT April-October (UTC+11)
-- OR
-- schedule = "0 12 * * *"   -- 22:00 AEDT October-March (UTC+10)
--
-- Note: Due to DST transitions, use two cron entries:
--   April to October (UTC+11): 0 11 * * *
--   October to March (UTC+10): 0 12 * * *
-- Hard-code the current UTC offset and update twice a year.
-- Future: use pg_cron extension for timezone-aware scheduling.
--
-- ============================================================================

-- ============================================================================
-- 9. PROFILES TABLE EXTENSIONS (for badge display)
-- ============================================================================

-- Add streak badge columns to profiles (via separate ALTER, idempotent)
do $$
begin
  -- Active Seeker badge earned (30-day streak ever achieved)
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles'
      and column_name = 'active_seeker_badge_earned'
  ) then
    alter table public.profiles
      add column active_seeker_badge_earned boolean not null default false;
  end if;

  -- Current streak count (for public display — read-only mirror of streaks table)
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles'
      and column_name = 'streak_display_count'
  ) then
    alter table public.profiles
      add column streak_display_count integer not null default 0;
  end if;
end $$;

-- RLS for the new profile columns (reuse existing profile policies)
-- The existing `profiles_select_own` and `profiles_update_own` policies
-- already cover these new columns since they apply to the table level.

-- ============================================================================
-- 10. PROFILES STREAK SYNC FUNCTION (called by Edge Function on milestone)
-- ============================================================================

create or replace function public.sync_streak_to_profile(
  p_user_id          uuid,
  p_current_streak   integer,
  p_longest_streak   integer
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_should_badge boolean;
begin
  -- Determine if the Active Seeker badge should be displayed
  v_should_badge := p_current_streak >= 30
                    or exists (
                      select 1 from public.profiles
                      where id = p_user_id
                        and active_seeker_badge_earned = true
                    );

  -- If user just hit 30-day streak, mark badge as earned permanently
  if p_current_streak >= 30 then
    v_should_badge := true;
  end if;

  update public.profiles
  set streak_display_count = p_current_streak,
      active_seeker_badge_earned = case
        when p_current_streak >= 30 then true
        else active_seeker_badge_earned
      end,
      updated_at = now()
  where id = p_user_id;
end;
$$;

grant execute on function public.sync_streak_to_profile(uuid, integer, integer) to service_role;

-- ============================================================================
-- 11. NOTIFICATION PREFERENCES CATEGORY (for streak opt-out)
-- ============================================================================

-- Add 'streak_reminder' category to notification preferences.
-- This is handled at the application level in the existing
-- notification_preferences table (adds to the categories[] array pattern).

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
