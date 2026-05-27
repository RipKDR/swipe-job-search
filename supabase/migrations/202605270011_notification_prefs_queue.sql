-- Notification preferences and queue (ARCHITECTURE_AUDIT.md CRITICAL-2 fix)

create table notification_preferences (
  profile_id uuid primary key references profiles(id) on delete cascade,
  matches_push boolean not null default true,
  messages_push boolean not null default true,
  interest_push boolean not null default true,
  hire_push boolean not null default true,
  email_fallback boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table notification_preferences enable row level security;

create trigger notification_preferences_updated_at
  before update on notification_preferences
  for each row execute function public.set_updated_at();

-- Persistent notification queue for reliable dispatch
create table notification_queue (
  id uuid primary key default gen_random_uuid(),
  type text not null,
  idempotency_key text not null,
  payload jsonb not null,
  status notification_status not null default 'pending',
  attempts int not null default 0,
  last_error text,
  created_at timestamptz not null default now(),
  processed_at timestamptz
);

alter table notification_queue add constraint notification_queue_idempotency unique (idempotency_key);
create index notification_queue_pending_idx on notification_queue (status, created_at)
  where status = 'pending';

-- No RLS on notification_queue - service role only

-- Complete handle_new_user (notification_preferences table now exists)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, created_at, updated_at)
  values (new.id, new.email, now(), now())
  on conflict (id) do nothing;

  insert into public.notification_preferences (profile_id)
  values (new.id)
  on conflict (profile_id) do nothing;

  return new;
end;
$$;

-- Notification triggers (queue table must exist first)
create trigger on_swipe_right_notify
  after insert on swipes
  for each row execute function public.enqueue_interest_notification();

create trigger on_match_created_notify
  after insert on matches
  for each row execute function public.enqueue_match_notification();

create trigger on_message_created_notify
  after insert on messages
  for each row execute function public.enqueue_message_notification();
