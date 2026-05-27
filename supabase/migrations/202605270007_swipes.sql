-- Swipes table and interest notification trigger

create table swipes (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references profiles(id),
  job_id uuid not null references jobs(id) on delete cascade,
  direction swipe_direction not null,
  created_at timestamptz not null default now()
);

alter table swipes add constraint swipes_unique_candidate_job unique (candidate_id, job_id);
create index swipes_job_direction_idx on swipes (job_id, direction, created_at desc);
create index swipes_candidate_idx on swipes (candidate_id, created_at desc);

alter table swipes enable row level security;

-- Enqueue interest notification on swipe right
create or replace function public.enqueue_interest_notification()
returns trigger
language plpgsql
security definer
as $$
declare
  v_employer_id uuid;
begin
  if new.direction = 'right' then
    select employer_id into v_employer_id from jobs where id = new.job_id;
    insert into notification_queue (type, idempotency_key, payload)
    values (
      'interest_received',
      'interest:' || new.id::text,
      jsonb_build_object(
        'swipe_id', new.id,
        'job_id', new.job_id,
        'candidate_id', new.candidate_id,
        'employer_id', v_employer_id
      )
    )
    on conflict (idempotency_key) do nothing;
  end if;
  return new;
end;
$$;

create trigger on_swipe_right_notify
  after insert on swipes
  for each row execute function public.enqueue_interest_notification();
