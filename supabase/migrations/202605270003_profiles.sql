-- Profiles table and auto-create trigger

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role user_role,
  full_name text,
  email text not null,
  phone text,
  suburb text,
  avatar_url text,
  experience_text text,
  skills text[] default '{}',
  availability_text text,
  work_rights text,
  onboarding_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index profiles_role_idx on profiles (role);
create index profiles_suburb_idx on profiles (suburb);

-- Enable RLS
alter table profiles enable row level security;

-- Auto-create profile on auth signup
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

  -- notification_preferences row created in migration 011 (table does not exist yet)
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- updated_at trigger
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at
  before update on profiles
  for each row execute function public.set_updated_at();
