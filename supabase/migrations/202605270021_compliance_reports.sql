-- Compliance reports: persistence for Centrelink/DEWR reporting
-- ARCHITECTURE AUDIT FIX #1: compliance export persistence
-- Adds storage for weekly compliance report PDFs and structured data

-- Enum for compliance report types
create type compliance_report_type as enum (
  'weekly_summary',
  'fortnightly',
  'monthly',
  'bulk_swipe_audit',
  'other'
);

-- Compliance reports table
create table compliance_reports (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references profiles(id),
  provider_id uuid not null references profiles(id),
  period_start date not null,
  period_end date not null,
  report_type compliance_report_type not null default 'weekly_summary',
  storage_path text,
  report_data jsonb,
  status text not null default 'pending'
    check (status in ('pending', 'generating', 'completed', 'failed')),
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index compliance_reports_candidate_idx on compliance_reports (candidate_id, period_start desc);
create index compliance_reports_provider_idx on compliance_reports (provider_id, created_at desc);
create index compliance_reports_period_idx on compliance_reports (period_start, period_end);

alter table compliance_reports enable row level security;

-- updated_at trigger
create trigger compliance_reports_updated_at
  before update on compliance_reports
  for each row execute function public.set_updated_at();

-- RLS: provider (employer) can read their own reports
create policy "compliance_reports_select_provider" on compliance_reports for select
  using (provider_id = auth.uid());

-- RLS: candidate can read their own reports
create policy "compliance_reports_select_candidate" on compliance_reports for select
  using (candidate_id = auth.uid());

-- RLS: service role manages all (insert/update via Edge Function)
create policy "compliance_reports_insert_service" on compliance_reports for insert
  with check (auth.role() = 'service_role');

create policy "compliance_reports_update_service" on compliance_reports for update
  using (auth.role() = 'service_role');

-- Storage bucket for compliance report PDFs (private — provider/candidate RLS)
insert into storage.buckets (id, name, public)
values ('compliance-reports', 'compliance-reports', false)
on conflict (id) do nothing;

-- Storage policies: provider writes own prefix, provider and candidate can read own
create policy "compliance_reports_storage_insert_provider"
on storage.objects for insert
with check (
  bucket_id = 'compliance-reports'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "compliance_reports_storage_select_provider"
on storage.objects for select
using (
  bucket_id = 'compliance-reports'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "compliance_reports_storage_select_candidate"
on storage.objects for select
using (
  bucket_id = 'compliance-reports'
  and (storage.foldername(name))[2] = auth.uid()::text
);

-- DB trigger: when a report is inserted with status 'pending',
-- enqueue a notification to trigger the compliance-export Edge Function
create or replace function public.enqueue_compliance_report()
returns trigger
language plpgsql
security definer
as $$
begin
  if new.status = 'pending' then
    insert into notification_queue (type, idempotency_key, payload)
    values (
      'compliance_generate',
      'compliance:' || new.id::text,
      jsonb_build_object(
        'report_id', new.id,
        'candidate_id', new.candidate_id,
        'provider_id', new.provider_id,
        'period_start', new.period_start,
        'period_end', new.period_end,
        'report_type', new.report_type
      )
    )
    on conflict (idempotency_key) do nothing;
  end if;
  return new;
end;
$$;

create trigger on_compliance_report_pending
  after insert on compliance_reports
  for each row execute function public.enqueue_compliance_report();
