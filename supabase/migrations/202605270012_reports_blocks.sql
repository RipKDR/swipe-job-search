-- Reports and blocks (App Store moderation requirement)

create table reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references profiles(id),
  reported_id uuid not null references profiles(id),
  job_id uuid references jobs(id),
  match_id uuid references matches(id),
  reason report_reason not null,
  details text,
  status report_status not null default 'pending',
  created_at timestamptz not null default now()
);

alter table reports enable row level security;

create table blocks (
  blocker_id uuid references profiles(id) on delete cascade,
  blocked_id uuid references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id)
);

alter table blocks enable row level security;
