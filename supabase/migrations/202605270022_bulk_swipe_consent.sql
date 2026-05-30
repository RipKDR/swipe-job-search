-- Bulk swipe consent: provider/employer mentors can swipe on behalf of candidates
-- ARCHITECTURE AUDIT FIX #2: bulk_swipe_consent schema
-- Adds consent flag + audit trail for provider-assisted swipes

-- Add consent columns to profiles
alter table profiles
  add column if not exists bulk_swipe_consent boolean not null default false,
  add column if not exists consent_granted_at timestamptz;

-- Bulk swipe audit log: every provider-assisted swipe is recorded
create table bulk_swipe_log (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references profiles(id),
  candidate_id uuid not null references profiles(id),
  job_id uuid not null references jobs(id),
  direction swipe_direction not null,
  created_at timestamptz not null default now()
);

create index bulk_swipe_log_provider_idx on bulk_swipe_log (provider_id, created_at desc);
create index bulk_swipe_log_candidate_idx on bulk_swipe_log (candidate_id, created_at desc);

alter table bulk_swipe_log enable row level security;

-- RLS: provider can read own audit trail
create policy "bulk_swipe_log_select_provider" on bulk_swipe_log for select
  using (provider_id = auth.uid());

-- RLS: candidate can read audit of their own swipes
create policy "bulk_swipe_log_select_candidate" on bulk_swipe_log for select
  using (candidate_id = auth.uid());

-- RLS: insert via service role or provider
create policy "bulk_swipe_log_insert_provider" on bulk_swipe_log for insert
  with check (
    provider_id = auth.uid()
    and exists (
      select 1 from profiles
      where id = candidate_id
        and bulk_swipe_consent = true
        and consent_granted_at is not null
    )
  );

-- Validate consent is granted before allowing bulk swipe
create or replace function public.check_bulk_swipe_consent()
returns trigger
language plpgsql
security definer
as $$
begin
  if not exists (
    select 1 from profiles
    where id = new.candidate_id
      and bulk_swipe_consent = true
      and consent_granted_at is not null
  ) then
    raise exception 'BULK_SWIPE_CONSENT_REQUIRED: Candidate % has not granted bulk swipe consent', new.candidate_id;
  end if;
  return new;
end;
$$;

create trigger before_bulk_swipe_log_insert
  before insert on bulk_swipe_log
  for each row execute function public.check_bulk_swipe_consent();
