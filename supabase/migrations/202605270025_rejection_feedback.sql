-- Rejection Feedback schema: structured reasons from candidates and employers
--
-- Two feedback channels:
--   candidate_feedback  — candidate explains why they declined/rejected a role
--   employer_feedback   — employer explains why a candidate was rejected
--
-- Both are opt-in / voluntary.  No feedback is required.
-- RLS ensures each party only sees their own feedback rows.

-- ── Rejection reason enumeration ──────────────────────────────────────

create type rejection_reasons as enum (
  'not_interested',
  'salary_too_low',
  'location_too_far',
  'skills_mismatch',
  'schedule_conflict',
  'already_hired',
  'other'
);

-- ── Candidate feedback ───────────────────────────────────────────────

create table candidate_feedback (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references jobs(id),
  candidate_id uuid not null references profiles(id),
  reason rejection_reasons not null,
  detail text,                                         -- optional free-text elaboration
  created_at timestamptz not null default now()
);

create index candidate_feedback_candidate_idx on candidate_feedback (candidate_id, created_at desc);
create index candidate_feedback_job_idx on candidate_feedback (job_id);

alter table candidate_feedback enable row level security;

-- RLS: candidates insert their own feedback
create policy "candidate_feedback_insert_own" on candidate_feedback for insert
  with check (candidate_id = auth.uid());

-- RLS: candidates read their own feedback
create policy "candidate_feedback_select_own" on candidate_feedback for select
  using (candidate_id = auth.uid());

-- ── Employer feedback ────────────────────────────────────────────────

create table employer_feedback (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references matches(id),  -- a match/conversation that didn't proceed
  employer_id uuid not null references profiles(id),
  reason text not null,
  detail text,
  created_at timestamptz not null default now()
);

create index employer_feedback_employer_idx on employer_feedback (employer_id, created_at desc);
create index employer_feedback_application_idx on employer_feedback (application_id);

alter table employer_feedback enable row level security;

-- RLS: employers insert their own feedback
create policy "employer_feedback_insert_own" on employer_feedback for insert
  with check (employer_id = auth.uid());

-- RLS: employers read their own feedback
create policy "employer_feedback_select_own" on employer_feedback for select
  using (employer_id = auth.uid());
