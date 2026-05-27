-- Storage buckets and policies

insert into storage.buckets (id, name, public)
values
  ('avatars', 'avatars', true),
  ('job-photos', 'job-photos', true);

-- Avatars: owner write, public read
create policy "avatars_insert_own"
on storage.objects for insert
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "avatars_update_own"
on storage.objects for update
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "avatars_delete_own"
on storage.objects for delete
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "avatars_select_all"
on storage.objects for select
using (bucket_id = 'avatars');

-- Job photos: employer write own prefix, public read
create policy "job_photos_insert_own"
on storage.objects for insert
with check (
  bucket_id = 'job-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "job_photos_update_own"
on storage.objects for update
using (
  bucket_id = 'job-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "job_photos_delete_own"
on storage.objects for delete
using (
  bucket_id = 'job-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "job_photos_select_all"
on storage.objects for select
using (bucket_id = 'job-photos');
