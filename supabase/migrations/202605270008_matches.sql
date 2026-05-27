-- Matches table, unique constraint (race fix), and create_match RPC

create table matches (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references jobs(id),
  candidate_id uuid not null references profiles(id),
  employer_id uuid not null references profiles(id),
  status match_status not null default 'chatting',
  initiated_by uuid not null references profiles(id),
  candidate_hire_confirmed boolean not null default false,
  employer_hire_confirmed boolean not null default false,
  hire_initiated_by uuid references profiles(id),
  hire_initiated_at timestamptz,
  hired_at timestamptz,
  unmatched_at timestamptz,
  unmatched_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ARCHITECTURE_AUDIT.md CRITICAL-1 fix
alter table matches add constraint matches_unique_job_candidate unique (job_id, candidate_id);
create index matches_candidate_status_idx on matches (candidate_id, status, created_at desc);
create index matches_employer_status_idx on matches (employer_id, status, created_at desc);

alter table matches enable row level security;

create trigger matches_updated_at
  before update on matches
  for each row execute function public.set_updated_at();

-- Atomic match creation RPC (employer-initiated)
create or replace function public.create_match(p_job_id uuid, p_candidate_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_job jobs%rowtype;
  v_match_id uuid;
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

  insert into matches (job_id, candidate_id, employer_id, initiated_by)
  values (p_job_id, p_candidate_id, v_job.employer_id, auth.uid())
  on conflict (job_id, candidate_id) do update
    set updated_at = now()
  returning id into v_match_id;

  return v_match_id;
end;
$$;

-- Enqueue match notification on insert
create or replace function public.enqueue_match_notification()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into notification_queue (type, idempotency_key, payload)
  values (
    'match_created',
    'match:' || new.id::text || ':push',
    jsonb_build_object(
      'match_id', new.id,
      'job_id', new.job_id,
      'candidate_id', new.candidate_id,
      'employer_id', new.employer_id
    )
  )
  on conflict (idempotency_key) do nothing;
  return new;
end;
$$;

-- Trigger attached in 011 after notification_queue exists
