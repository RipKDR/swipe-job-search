-- Media attachments for messages

create table if not exists message_attachments (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references messages(id) on delete cascade,
  mime_type text not null,
  storage_path text not null,
  file_size int not null,
  width int,
  height int,
  duration_seconds numeric, -- for audio/video
  created_at timestamptz not null default now()
);

create index if not exists message_attachments_message_idx on message_attachments (message_id);

alter table message_attachments enable row level security;

create policy "message_attachments_select" on message_attachments
for select using (
  exists (
    select 1 from messages m
    join matches on matches.id = m.match_id
    where m.id = message_attachments.message_id
    and (matches.candidate_id = auth.uid() or matches.employer_id = auth.uid())
  )
);

create policy "message_attachments_insert" on message_attachments
for insert with check (
  exists (
    select 1 from messages m
    join matches on matches.id = m.match_id
    where m.id = message_attachments.message_id
    and (matches.candidate_id = auth.uid() or matches.employer_id = auth.uid())
    and m.sender_id = auth.uid()
  )
);

-- Add to realtime publication
alter publication supabase_realtime add table message_attachments;

-- Storage bucket for chat media (created via Supabase dashboard or separate migration)
-- insert into storage.buckets (id, name, public) values ('chat-media', 'chat-media', false);