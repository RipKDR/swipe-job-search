-- Create storage bucket for chat media attachments
-- Refs: migration 202606060002_media_attachments.sql

insert into storage.buckets (id, name, public, avif_autodetection, file_size_limit, allowed_mime_types)
values (
  'chat-media',
  'chat-media',
  false,
  false,
  26214400, -- 25MB
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/heic',
    'video/mp4',
    'video/quicktime',
    'video/x-m4v',
    'audio/mpeg',
    'audio/wav',
    'audio/mp4',
    'audio/x-m4a',
    'audio/ogg',
    'application/pdf'
  ]
)
on conflict (id) do update set
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- RLS policy: only match participants can read/download
create policy "chat_media_select"
on storage.objects
for select
using (
  bucket_id = 'chat-media'
  and exists (
    select 1 from message_attachments ma
    join messages m on m.id = ma.message_id
    join matches on matches.id = m.match_id
    where ma.storage_path = storage.objects.name
    and (matches.candidate_id = auth.uid() or matches.employer_id = auth.uid())
  )
);

-- RLS policy: only the sender can upload
create policy "chat_media_insert"
on storage.objects
for insert
with check (
  bucket_id = 'chat-media'
  and auth.role() = 'authenticated'
);

-- RLS policy: sender can update their uploads
create policy "chat_media_update"
on storage.objects
for update
using (
  bucket_id = 'chat-media'
  and auth.uid() = owner
)
with check (
  bucket_id = 'chat-media'
  and auth.uid() = owner
);

-- RLS policy: sender can delete their uploads
create policy "chat_media_delete"
on storage.objects
for delete
using (
  bucket_id = 'chat-media'
  and auth.uid() = owner
);
