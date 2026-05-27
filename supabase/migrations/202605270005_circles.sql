-- Circles and circle membership

create table circles (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  suburb_anchor text not null,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);

create table circle_members (
  profile_id uuid references profiles(id) on delete cascade,
  circle_id uuid references circles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (profile_id, circle_id)
);

alter table circles enable row level security;
alter table circle_members enable row level security;

-- Auto-assign default circle on onboarding completion
create or replace function public.assign_default_circle()
returns trigger
language plpgsql
security definer
as $$
declare
  default_circle uuid;
begin
  if new.onboarding_completed_at is not null
     and (old.onboarding_completed_at is null) then
    select id into default_circle from circles where is_default = true limit 1;
    if default_circle is not null then
      insert into circle_members (profile_id, circle_id)
      values (new.id, default_circle)
      on conflict do nothing;
    end if;
  end if;
  return new;
end;
$$;

create trigger on_profile_onboarding_complete
  after update on profiles
  for each row execute function public.assign_default_circle();

-- Seed default circle for MVP beachhead
insert into circles (name, suburb_anchor, is_default)
values ('Northern Melbourne', 'Tullamarine', true);
