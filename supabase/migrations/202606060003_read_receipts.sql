-- Read receipts: add read_at column to messages

alter table messages
add column if not exists read_at timestamptz;

create index if not exists messages_match_read_idx on messages (match_id, read_at);

-- Update RLS policy to allow reading read_at
-- (existing policy already allows all columns for match participants)

-- Add realtime publication for read_at updates (if not already added)
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'messages'
  ) then
    alter publication supabase_realtime add table messages;
  end if;
end $$;