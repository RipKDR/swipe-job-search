-- Compliance report rows + runs: retry-safe per-candidate persistence
-- ARCHITECTURE AUDIT HIGH-3 FIX: persist rows before PDF generation,
-- so partial failures are recoverable.

-- ── Run status tracking ──────────────────────────────────────────────
create table compliance_report_runs (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references compliance_reports(id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'generating', 'completed', 'failed')),
  total_candidates int not null default 0,
  completed_candidates int not null default 0,
  failed_candidates int not null default 0,
  error_message text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index compliance_report_runs_report_idx on compliance_report_runs (report_id);
create index compliance_report_runs_status_idx on compliance_report_runs (status);

alter table compliance_report_runs enable row level security;

-- updated_at trigger
create trigger compliance_report_runs_updated_at
  before update on compliance_report_runs
  for each row execute function public.set_updated_at();

-- ── Per-candidate row persistence ────────────────────────────────────
create table compliance_report_rows (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references compliance_reports(id) on delete cascade,
  run_id uuid not null references compliance_report_runs(id) on delete cascade,
  candidate_id uuid not null references profiles(id),
  status text not null default 'pending'
    check (status in ('pending', 'generating', 'completed', 'failed')),
  -- Structured data per candidate (assembled from swipes/matches/hires)
  swipe_count int not null default 0,
  right_swipe_count int not null default 0,
  unique_jobs_interacted int not null default 0,
  match_count int not null default 0,
  hire_count int not null default 0,
  -- Raw snapshots for audit trail
  swipes_data jsonb,
  matches_data jsonb,
  hires_data jsonb,
  -- Computed metrics
  total_earnings numeric(10,2),
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index compliance_report_rows_report_idx on compliance_report_rows (report_id);
create index compliance_report_rows_run_idx on compliance_report_rows (run_id);
create index compliance_report_rows_candidate_idx on compliance_report_rows (candidate_id);

alter table compliance_report_rows enable row level security;

-- updated_at trigger
create trigger compliance_report_rows_updated_at
  before update on compliance_report_rows
  for each row execute function public.set_updated_at();

-- ── RLS: provider owns their runs and rows ───────────────────────────
-- compliance_report_runs
create policy "compliance_runs_select_provider" on compliance_report_runs for select
  using (
    exists (
      select 1 from compliance_reports
      where compliance_reports.id = report_id
        and compliance_reports.provider_id = auth.uid()
    )
  );

create policy "compliance_runs_insert_service" on compliance_report_runs for insert
  with check (auth.role() = 'service_role');

create policy "compliance_runs_update_service" on compliance_report_runs for update
  using (auth.role() = 'service_role');

-- compliance_report_rows
create policy "compliance_rows_select_provider" on compliance_report_rows for select
  using (
    exists (
      select 1 from compliance_reports
      where compliance_reports.id = report_id
        and compliance_reports.provider_id = auth.uid()
    )
  );

create policy "compliance_rows_select_candidate" on compliance_report_rows for select
  using (candidate_id = auth.uid());

create policy "compliance_rows_insert_service" on compliance_report_rows for insert
  with check (auth.role() = 'service_role');

create policy "compliance_rows_update_service" on compliance_report_rows for update
  using (auth.role() = 'service_role');
