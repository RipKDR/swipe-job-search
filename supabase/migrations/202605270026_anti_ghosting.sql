-- Anti-Ghosting data model: employer ratings + ghosting reports
--
-- Purpose: Provide data for future ghosting-risk scoring.  Candidates rate
-- their interaction with an employer after a match, and can report ghosting
-- incidents.  This table is purely informational/analytical — no automated
-- action is taken based on scores (to avoid bias or misuse).
--
-- RLS: candidates insert their own ratings/reports; aggregated data is
-- readable by all authenticated users (for informed decisions).

-- ── Employer ratings (candidate → employer feedback) ─────────────────

create table employer_ratings (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references jobs(id),
  candidate_id uuid not null references profiles(id),
  communication_rating int not null
    check (communication_rating >= 1 and communication_rating <= 5),
  hiring_duration_days int,                   -- nullable — may not be known
  role_accuracy_rating int not null
    check (role_accuracy_rating >= 1 and role_accuracy_rating <= 5),
  overall_score numeric
    generated always as ((communication_rating + role_accuracy_rating) / 2.0) stored,
  created_at timestamptz not null default now()
);

-- Prevent double-rating: one rating per candidate per job
create unique index employer_ratings_candidate_job_uniq
  on employer_ratings (candidate_id, job_id);

create index employer_ratings_job_idx on employer_ratings (job_id);
create index employer_ratings_candidate_idx on employer_ratings (candidate_id);

alter table employer_ratings enable row level security;

-- RLS: candidates insert their own ratings
create policy "employer_ratings_insert_own" on employer_ratings for insert
  with check (candidate_id = auth.uid());

-- RLS: all authenticated users can read ratings (for aggregated views / transparency)
create policy "employer_ratings_select_all" on employer_ratings for select
  using (auth.role() = 'authenticated');

-- ── Ghosting reports (candidate-submitted incident records) ──────────

create table ghosting_reports (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references jobs(id),
  candidate_id uuid not null references profiles(id),
  report_type text not null
    check (report_type in ('no_response', 'offer_withdrawn', 'no_show')),
  detail text,
  created_at timestamptz not null default now()
);

create index ghosting_reports_candidate_idx on ghosting_reports (candidate_id, created_at desc);
create index ghosting_reports_job_idx on ghosting_reports (job_id);
create index ghosting_reports_type_idx on ghosting_reports (report_type);

-- Prevent duplicate reports for the same candidate + job + type
create unique index ghosting_reports_uniq
  on ghosting_reports (candidate_id, job_id, report_type);

alter table ghosting_reports enable row level security;

-- RLS: candidates insert their own reports
create policy "ghosting_reports_insert_own" on ghosting_reports for insert
  with check (candidate_id = auth.uid());

-- RLS: all authenticated users can read reports (for aggregated insights)
create policy "ghosting_reports_select_all" on ghosting_reports for select
  using (auth.role() = 'authenticated');
