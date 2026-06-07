-- 202606070004_bookmarks.sql
-- Saved Jobs / Bookmarks for candidates
--
-- Part of the Bookmarks feature handoff (Jordan Architecture).
-- Ran after streaks migration (202606070003_streaks.sql).
--
-- Model: junction table between profiles and jobs with RLS.
-- Toggle is handled via direct Supabase insert/delete (client)
-- or via the toggle_bookmark RPC for atomic server-side toggle.
--
-- Indexes support "my saved jobs" query (user_id, created_at desc)
-- and "who saved this" count query (job_id).

-- ─── Table ─────────────────────────────────────────────────────────────────

create table public.bookmarks (
  id         uuid          primary key default gen_random_uuid(),
  user_id    uuid          not null references public.profiles(id) on delete cascade,
  job_id     uuid          not null references public.jobs(id) on delete cascade,
  created_at timestamptz   not null default now(),

  -- A user can bookmark a given job at most once.
  -- Toggle off deletes the row, so unique constraint is correct.
  constraint bookmarks_unique_user_job unique (user_id, job_id)
);

-- ─── Indexes ───────────────────────────────────────────────────────────────

-- Fast lookup: "all my bookmarks, newest first"
create index idx_bookmarks_user_created
  on public.bookmarks (user_id, created_at desc);

-- Fast lookup: "count bookmarks for this job" (employer insight)
create index idx_bookmarks_job_id
  on public.bookmarks (job_id);

-- ─── RLS ───────────────────────────────────────────────────────────────────

alter table public.bookmarks enable row level security;

-- Candidates: SELECT own bookmarks
create policy "bookmarks_select_own"
  on public.bookmarks for select
  using (user_id = auth.uid());

-- Candidates: INSERT own bookmarks
create policy "bookmarks_insert_own"
  on public.bookmarks for insert
  with check (user_id = auth.uid());

-- Candidates: DELETE own bookmarks
create policy "bookmarks_delete_own"
  on public.bookmarks for delete
  using (user_id = auth.uid());

-- NOTE: No UPDATE policy needed — bookmarks are static after insert.
-- Re-bookmarking means delete then insert.

-- ─── RPC: toggle_bookmark (optional but recommended) ───────────────────────

-- Atomic toggle: insert if not exists, delete if exists.
-- Returns { bookmarked: boolean }.
-- Use via: supabase.rpc('toggle_bookmark', { p_job_id })
-- Falls back to direct table CRUD if RPC unavailable.

create or replace function public.toggle_bookmark(p_job_id uuid)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_bookmarked boolean;
begin
  if v_user_id is null then
    return json_build_object(
      'error', 'Not authenticated',
      'bookmarked', false
    );
  end if;

  -- Check if bookmark exists
  select exists(
    select 1 from public.bookmarks
    where user_id = v_user_id and job_id = p_job_id
  ) into v_bookmarked;

  if v_bookmarked then
    -- Unbookmark: delete the row
    delete from public.bookmarks
    where user_id = v_user_id and job_id = p_job_id;
    return json_build_object('bookmarked', false);
  else
    -- Bookmark: insert new row
    insert into public.bookmarks (user_id, job_id)
    values (v_user_id, p_job_id);
    return json_build_object('bookmarked', true);
  end if;
end;
$$;

-- ─── RPC: get_bookmark_count (employer insight) ───────────────────────────

-- Aggregate count for a given job.
-- Use via: supabase.rpc('get_bookmark_count', { p_job_id })
-- Returns integer.
-- NOTE: This is intentionally NOT security definer — it respects RLS
-- so only authenticated users who can see the job can see the count.

create or replace function public.get_bookmark_count(p_job_id uuid)
returns integer
language sql
stable
set search_path = public
as $$
  select count(*)::integer
  from public.bookmarks
  where job_id = p_job_id;
$$;

-- ─── Verify ────────────────────────────────────────────────────────────────

do $$
begin
  -- Verify table exists
  assert exists (
    select from information_schema.tables
    where table_schema = 'public' and table_name = 'bookmarks'
  ), 'bookmarks table not created';

  -- Verify RLS is enabled
  assert exists (
    select from pg_tables
    where schemaname = 'public' and tablename = 'bookmarks' and rowsecurity = true
  ), 'RLS not enabled on bookmarks';

  -- Verify indexes
  assert exists (
    select from pg_indexes
    where schemaname = 'public' and tablename = 'bookmarks' and indexname = 'idx_bookmarks_user_created'
  ), 'idx_bookmarks_user_created not found';

  assert exists (
    select from pg_indexes
    where schemaname = 'public' and tablename = 'bookmarks' and indexname = 'idx_bookmarks_job_id'
  ), 'idx_bookmarks_job_id not found';
end;
$$;
