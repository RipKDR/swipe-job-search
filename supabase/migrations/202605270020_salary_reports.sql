-- Salary transparency: salary_reports table, aggregates, RLS, refresh function
-- Empowers jobseeker community with crowdsourced market-rate data per job

-- Create salary_reports table
create table salary_reports (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references jobs(id),
  hourly_rate numeric(10,2) not null check (hourly_rate > 0),
  report_type text not null check (report_type in ('actual','offer','estimate')),
  reported_by uuid not null references profiles(id),
  created_at timestamptz not null default now()
);

create index salary_reports_job_idx on salary_reports (job_id);
create index salary_reports_reported_by_idx on salary_reports (reported_by);

alter table salary_reports enable row level security;

-- RLS: users insert their own reports, everyone reads all (for aggregate transparency)
create policy "salary_reports_insert_own" on salary_reports for insert
  with check (reported_by = auth.uid());

create policy "salary_reports_select_all" on salary_reports for select
  using (true);

-- Materialized view for salary aggregates per job
create materialized view salary_aggregates as
select
  job_id,
  avg(hourly_rate)::numeric(10,2) as avg_hourly_rate,
  min(hourly_rate)::numeric(10,2) as min_hourly_rate,
  max(hourly_rate)::numeric(10,2) as max_hourly_rate,
  count(*)::integer as report_count,
  now() as updated_at
from salary_reports
group by job_id
order by job_id;

create unique index salary_aggregates_job_idx on salary_aggregates (job_id);

-- Allow all authenticated users to read aggregates
grant select on salary_aggregates to authenticated;

-- Refresh function for the materialized view
create or replace function public.refresh_salary_aggregates()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  refresh materialized view concurrently salary_aggregates;
end;
$$;

grant execute on function public.refresh_salary_aggregates() to authenticated;

-- Trigger: auto-refresh aggregates when a new salary report is inserted
create or replace function public.refresh_salary_aggregates_on_report()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Fire-and-forget: run refresh in background via NOTIFY
  -- The refresh itself is deferred to avoid blocking the insert
  perform pg_notify('refresh_salary_aggregates', '');
  return new;
end;
$$;

create trigger salary_reports_after_insert
  after insert on salary_reports
  for each row execute function public.refresh_salary_aggregates_on_report();
