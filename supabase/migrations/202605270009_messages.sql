-- Messages table and notification trigger

create table messages (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references matches(id) on delete cascade,
  sender_id uuid not null references profiles(id),
  body text not null check (char_length(body) <= 4000),
  created_at timestamptz not null default now()
);

create index messages_match_created_idx on messages (match_id, created_at);

alter table messages enable row level security;

-- Enqueue message notification on insert
create or replace function public.enqueue_message_notification()
returns trigger
language plpgsql
security definer
as $$
declare
  v_match matches%rowtype;
  v_recipient uuid;
begin
  select * into v_match from matches where id = new.match_id;
  if v_match.candidate_id = new.sender_id then
    v_recipient := v_match.employer_id;
  else
    v_recipient := v_match.candidate_id;
  end if;

  insert into notification_queue (type, idempotency_key, payload)
  values (
    'message_received',
    'message:' || new.id::text,
    jsonb_build_object(
      'message_id', new.id,
      'match_id', new.match_id,
      'sender_id', new.sender_id,
      'recipient_id', v_recipient,
      'preview', left(new.body, 120)
    )
  )
  on conflict (idempotency_key) do nothing;
  return new;
end;
$$;

create trigger on_message_created_notify
  after insert on messages
  for each row execute function public.enqueue_message_notification();
