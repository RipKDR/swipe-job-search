-- Jobs table

create table jobs (
  id uuid primary key default gen_random_uuid(),
  employer_id uuid not null references profiles(id),
  circle_id uuid not null references circles(id),
  title text not null,
  job_type job_type not null,
  pay_display text not null,
  pay_amount numeric(10,2) not null,
  pay_period text not null check (pay_period in ('hour','week','year')),
  hours_text text not null,
  suburb text not null,
  description text,
  photo_url text,
  status job_status not null default 'active',
  expires_at timestamptz not null,
  hired_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index jobs_circle_status_idx on jobs (circle_id, status, created_at desc);
create index jobs_employer_idx on jobs (employer_id, status);
create index jobs_expires_at_idx on jobs (expires_at) where status = 'active';

alter table jobs enable row level security;

create trigger jobs_updated_at
  before update on jobs
  for each row execute function public.set_updated_at();
