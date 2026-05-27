-- Device tokens for Expo push notifications

create table device_tokens (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  expo_push_token text not null,
  platform text not null check (platform in ('ios','android')),
  created_at timestamptz not null default now(),
  last_used_at timestamptz not null default now()
);

alter table device_tokens add constraint device_tokens_unique unique (expo_push_token);
create index device_tokens_profile_idx on device_tokens (profile_id);

alter table device_tokens enable row level security;
