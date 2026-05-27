# Supabase Local Development Setup

This directory contains the Supabase configuration, migrations, Edge Functions, and seed data for Hi-Hired MVP.

## Prerequisites

- [Supabase CLI](https://supabase.com/docs/guides/cli) installed
- Docker Desktop running
- Node.js 20+

## Quick Start

### 1. Install Supabase CLI

```bash
npm install -g supabase
```

### 2. Start Supabase locally

```bash
supabase start
```

This will:
- Start local Postgres database
- Start Supabase Studio (local dashboard)
- Apply all migrations in order
- Start Edge Functions runtime

### 3. Apply migrations and seed data

Migrations are applied automatically on `supabase start`. To reset and re-apply:

```bash
pnpm db:reset
# or
supabase db reset
```

**Manual seed (dev/staging):**

If you want to manually run the seed without the `app.settings.seed_enabled` flag:

```bash
psql postgresql://postgres:postgres@localhost:54322/postgres -f supabase/seed/beachhead_jobs.sql
```

### 4. Access Supabase Studio

Open [http://localhost:54323](http://localhost:54323)

Credentials:
- Database: `postgres`
- Password: `postgres`

## Migrations

All migrations are in `supabase/migrations/` and numbered sequentially:

| # | File | Contents |
|---|------|----------|
| 001 | `extensions.sql` | pgcrypto, pg_net |
| 002 | `enums.sql` | All enums |
| 003 | `profiles.sql` | Profiles, auto-create trigger |
| 004 | `employer_profiles.sql` | Employer extension table |
| 005 | `circles.sql` | Circles, members, default circle seed |
| 006 | `jobs.sql` | Jobs table |
| 007 | `swipes.sql` | Swipes, interest notification trigger |
| 008 | `matches.sql` | Matches, create_match RPC |
| 009 | `messages.sql` | Messages, notification trigger |
| 010 | `device_tokens.sql` | Expo push tokens |
| 011 | `notification_prefs_queue.sql` | Preferences + queue (CRITICAL-2 fix) |
| 012 | `reports_blocks.sql` | Moderation tables |
| 013 | `rls.sql` | All RLS policies |
| 014 | `storage.sql` | Buckets + storage policies |
| 015 | `rpcs.sql` | confirm_hire, unmatch RPCs |
| 016 | `seed.sql` | Beachhead demo data |

### Creating new migrations

```bash
supabase migration new <name>
```

## Edge Functions

### Deploy locally

```bash
supabase functions serve
```

Functions will be available at `http://localhost:54321/functions/v1/<function-name>`

### Deploy to staging/production

```bash
supabase functions deploy notification-processor
supabase functions deploy expire-jobs
```

### Environment variables

Required for Edge Functions:

```bash
# Set via Supabase dashboard or CLI
supabase secrets set EXPO_ACCESS_TOKEN=<your-expo-token>
```

## Cron Jobs (Supabase Dashboard)

**Important:** Cron jobs must be configured in the Supabase Dashboard after deployment. They cannot be set via migrations.

### 1. notification-processor

- **Schedule:** Every 1 minute
- **Endpoint:** `https://<project>.supabase.co/functions/v1/notification-processor`
- **Cron expression:** `* * * * *`
- **Method:** POST
- **Headers:**
  - `Authorization: Bearer <anon-key>`

### 2. expire-jobs

- **Schedule:** Daily at 00:00 Australia/Melbourne
- **Endpoint:** `https://<project>.supabase.co/functions/v1/expire-jobs`
- **Cron expression:** `0 14 * * *` (00:00 Melbourne = 14:00 UTC)
- **Method:** POST
- **Headers:**
  - `Authorization: Bearer <anon-key>`

**To configure:**
1. Go to Supabase Dashboard → Edge Functions → Cron Jobs
2. Add new cron job for each function
3. Test by clicking "Run now"

## Realtime Publication

Enable Realtime for chat and inbox:

```sql
-- Run in Supabase SQL Editor or via psql
alter publication supabase_realtime add table messages;
alter publication supabase_realtime add table matches;
alter publication supabase_realtime add table swipes;
```

**Verify:**

```sql
select * from pg_publication_tables where pubname = 'supabase_realtime';
```

Should show `messages`, `matches`, and `swipes`.

## Testing

### SQL integration tests

```bash
# RLS policies
psql postgresql://postgres:postgres@localhost:54322/postgres -f supabase/tests/rls_swipes_test.sql

# RPC idempotency
psql postgresql://postgres:postgres@localhost:54322/postgres -f supabase/tests/rpc_create_match_test.sql
```

### TypeScript schema tests

```bash
pnpm test packages/shared/src/schemas/__tests__/job.schema.test.ts
```

## Troubleshooting

### Reset local database

```bash
supabase db reset
```

### View logs

```bash
supabase logs --follow
```

### Stop all services

```bash
supabase stop
```

### Check service status

```bash
supabase status
```

## Architecture Audit Fixes

This implementation includes fixes from `ARCHITECTURE_AUDIT.md`:

- **CRITICAL-1:** `matches_unique_job_candidate` constraint (migration 008)
- **CRITICAL-2:** `notification_queue` persistent table (migration 011)
- **HIGH-4:** Employer RLS read policy on swipes (migration 013)

## Production Checklist

Before deploying to production:

- [ ] Configure cron jobs in Supabase Dashboard
- [ ] Enable Realtime publication for messages, matches, swipes
- [ ] Set Edge Function secrets: `EXPO_ACCESS_TOKEN`
- [ ] Verify RLS policies via SQL tests
- [ ] Run `create_match` idempotency test
- [ ] Seed beachhead data (manual or via flag)
- [ ] Configure storage CORS for mobile app domains

## Related Docs

- [`../docs/BACKEND.md`](../docs/BACKEND.md) — Canonical schema source
- [`../ARCHITECTURE_AUDIT.md`](../ARCHITECTURE_AUDIT.md) — Critical fixes
- [`../STACK.md`](../STACK.md) — Tech stack overview
