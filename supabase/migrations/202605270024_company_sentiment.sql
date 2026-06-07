-- Company Sentiment pipeline: local scraped-text analysis for candidate reference
-- Legal notice: REAL scraping requires legal review (AU defamation/ACL concerns).
-- This migration provides the storage layer only; the scrape-and-score entry
-- point is a stub that logs "would scrape" until legal sign-off.
--
-- Architecture:
--   company_sentiments  — raw scored rows, one per scraped text fragment
--   company_aggregates  — materialised view, refreshed on demand
-- ── Raw sentiment rows ───────────────────────────────────────────────
create table company_sentiments (
  id uuid primary key default gen_random_uuid(),
  company_name text not null,
  source text not null,
  -- e.g. 'glassdoor', 'linkedin', 'seek_review'
  sentiment_label text not null check (
    sentiment_label in ('positive', 'neutral', 'negative')
  ),
  score float not null check (
    score >= -1.0
    and score <= 1.0
  ),
  snippet text,
  -- the actual text that was scored
  scraped_at timestamptz not null default now(),
  is_active boolean not null default true
);
-- Indexes for common query patterns
create index company_sentiments_name_idx on company_sentiments (company_name);
create index company_sentiments_name_label_idx on company_sentiments (company_name, sentiment_label);
create index company_sentiments_scraped_at_idx on company_sentiments (scraped_at desc);
alter table company_sentiments enable row level security;
-- RLS: service role only for insert
create policy "company_sentiments_insert_service" on company_sentiments for
insert with check (auth.role() = 'service_role');
-- RLS: authenticated users can read
create policy "company_sentiments_select_auth" on company_sentiments for
select using (auth.role() = 'authenticated');
-- ── Materialised aggregates ───────────────────────────────────────────
create materialized view company_aggregates as
select company_name,
  round(avg(score)::numeric, 4)::float as avg_score,
  count(*) as sample_count,
  max(scraped_at) as last_updated,
  case
    when avg(score) > 0.1 then 'positive'
    when avg(score) < -0.1 then 'negative'
    else 'neutral'
  end as trend
from company_sentiments
where is_active = true
group by company_name;
-- allow efficient lookups on the materialised view
create unique index company_aggregates_name_idx on company_aggregates (company_name);
-- Note: RLS policies cannot be created on materialized views in PostgreSQL.
-- The view inherits permissions from the underlying company_sentiments table,
-- which has RLS allowing authenticated users to SELECT.
-- ── Helper function to refresh aggregates ────────────────────────────
create or replace function public.refresh_company_aggregates() returns void language plpgsql security definer as $$ begin refresh materialized view concurrently company_aggregates;
end;
$$;