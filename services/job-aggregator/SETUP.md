# Setup Instructions

## Step 1: Create the jobs table (ONE TIME — copy/paste this SQL)

Go to: https://supabase.com/dashboard/project/twwmqqgjtdbcvrkinifa/sql/new

Paste and run this:

```sql
CREATE TABLE IF NOT EXISTS jobs (
  id UUID PRIMARY KEY,
  source TEXT NOT NULL,
  title TEXT NOT NULL,
  company TEXT DEFAULT '',
  description TEXT DEFAULT '',
  suburb TEXT DEFAULT '',
  postcode TEXT DEFAULT '',
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  category TEXT DEFAULT 'Other',
  work_type TEXT DEFAULT 'unknown',
  salary_text TEXT DEFAULT '',
  salary_min DOUBLE PRECISION,
  salary_max DOUBLE PRECISION,
  url TEXT DEFAULT '',
  normalized_url TEXT DEFAULT '',
  posted_date TIMESTAMPTZ,
  scraped_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  raw JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_jobs_source ON jobs (source);
CREATE INDEX IF NOT EXISTS idx_jobs_category ON jobs (category);
CREATE INDEX IF NOT EXISTS idx_jobs_suburb ON jobs (suburb);
CREATE INDEX IF NOT EXISTS idx_jobs_normalized_url ON jobs (normalized_url);
CREATE INDEX IF NOT EXISTS idx_jobs_scraped_at ON jobs (scraped_at DESC);
CREATE INDEX IF NOT EXISTS idx_jobs_posted_date ON jobs (posted_date DESC);

ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anon read" ON jobs FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anon upsert" ON jobs FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow anon update" ON jobs FOR UPDATE TO anon USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at BEFORE UPDATE ON jobs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

## Step 2: Run the scrapers

```bash
cd /home/admin/job-aggregator
node index.js --run-all
```
