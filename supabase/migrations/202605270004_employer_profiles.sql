-- Employer profiles extension table

create table employer_profiles (
  profile_id uuid primary key references profiles(id) on delete cascade,
  business_name text not null,
  about_text text,
  contact_name text,
  verified boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table employer_profiles enable row level security;

create trigger employer_profiles_updated_at
  before update on employer_profiles
  for each row execute function public.set_updated_at();
