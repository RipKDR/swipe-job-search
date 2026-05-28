-- MVP rate limits (docs/api/EDGE_FUNCTIONS_CONTRACTS.md §6)
-- 10 swipes / minute / candidate; 5 new matches / day / employer (idempotent retries exempt)

create or replace function public.enforce_swipe_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_recent_count int;
begin
  select count(*) into v_recent_count
  from swipes
  where candidate_id = new.candidate_id
    and created_at > now() - interval '1 minute';

  if v_recent_count >= 10 then
    raise exception 'RATE_LIMIT_EXCEEDED: Too many swipes. Try again in a minute.';
  end if;

  return new;
end;
$$;

drop trigger if exists swipes_rate_limit on swipes;
create trigger swipes_rate_limit
  before insert on swipes
  for each row execute function public.enforce_swipe_rate_limit();

-- Extend create_match with daily employer cap (skip when match already exists)
create or replace function public.create_match(p_job_id uuid, p_candidate_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_job jobs%rowtype;
  v_match_id uuid;
  v_existing_match_id uuid;
  v_daily_matches int;
begin
  select * into v_job from jobs
  where id = p_job_id and employer_id = auth.uid() and status = 'active';

  if not found then
    raise exception 'JOB_NOT_FOUND_OR_FORBIDDEN';
  end if;

  if not exists (
    select 1 from swipes
    where job_id = p_job_id
      and candidate_id = p_candidate_id
      and direction = 'right'
  ) then
    raise exception 'CANDIDATE_NOT_INTERESTED';
  end if;

  if exists (
    select 1
    from blocks b
    where (b.blocker_id = auth.uid() and b.blocked_id = p_candidate_id)
       or (b.blocker_id = p_candidate_id and b.blocked_id = auth.uid())
  ) then
    raise exception 'BLOCKED_PAIR';
  end if;

  select id into v_existing_match_id
  from matches
  where job_id = p_job_id and candidate_id = p_candidate_id;

  if v_existing_match_id is null then
    select count(*) into v_daily_matches
    from matches
    where employer_id = auth.uid()
      and created_at > now() - interval '1 day';

    if v_daily_matches >= 5 then
      raise exception 'RATE_LIMIT_EXCEEDED: Daily match limit reached. Try again tomorrow.';
    end if;
  end if;

  insert into matches (job_id, candidate_id, employer_id, initiated_by)
  values (p_job_id, p_candidate_id, v_job.employer_id, auth.uid())
  on conflict (job_id, candidate_id) do update
    set updated_at = now()
  returning id into v_match_id;

  return v_match_id;
end;
$$;

grant execute on function public.create_match(uuid, uuid) to authenticated;
