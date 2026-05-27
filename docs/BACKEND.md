# Hi-Hired — Backend Specification

> **Status:** Canonical · Ready for migrations  
> **Last updated:** 2026-05-27  
> **Stack reference:** [`../STACK.md`](../STACK.md)

PostgreSQL schema, RLS policies, Edge Functions, and storage for Hi-Hired MVP. A developer should be able to write numbered migrations directly from this document.

---

## Decisions (schema reconciliation)

Conflicts across [`SPEC.md`](../SPEC.md), [`foundational-docs/02-mvp-definition.md`](../foundational-docs/02-mvp-definition.md), and [`foundational-docs/03-technical-build-plan.md`](../foundational-docs/03-technical-build-plan.md) resolved as follows:

| Topic | Choice | Why |
|-------|--------|-----|
| Role names | `candidate`, `employer` | User-approved; aligns with foundational employer framing |
| Profile PK | `profiles.id` = `auth.users.id` | One row per auth user; simpler RLS (`auth.uid() = id`) |
| Employer data | `employer_profiles` extension table | Keeps candidate rows lean; MVP fields from 02-mvp-definition |
| Match creation | **Employer-initiated** from Interested List | Authoritative MVP flow — not bilateral swipe-to-match |
| Swipes table name | `swipes` | Candidate-only; direction `right` \| `left` |
| Circles | Included for beachhead | Single seed circle in MVP; multi-circle deferred |
| Provider / compliance | **Excluded from MVP schema** | [`PROVIDER_PORTAL.md`](../PROVIDER_PORTAL.md) deferred |
| Streaks | **Excluded from MVP** | Not in 02-mvp ship list |
| Super Apply / trial shift | **Excluded from MVP** | Post-MVP recruiter features |
| Job pay field | `pay_display text` + structured `pay_amount` / `pay_period` | Cards show human string ("$32/hr"); validation uses structured fields |
| Notification delivery | `notification_queue` + cron processor | Fixes fire-and-forget issue in [`ARCHITECTURE_AUDIT.md`](../ARCHITECTURE_AUDIT.md) |
| Push provider | Expo push tokens on `device_tokens` | Not OneSignal in MVP |
| Reports / blocks | **Included** | Required before App Store submission (02-mvp v1.1 gate) |

---

## Entity Relationship (MVP)

```
auth.users
    └── profiles (1:1)
            ├── employer_profiles (0:1, employers only)
            ├── circle_members (n:m → circles)
            ├── device_tokens (1:n)
            └── notification_preferences (1:1)

employer_profiles ──< jobs >── swipes >── profiles (candidates)
                      │
                      └──< matches >── messages
                              │
                              └── hire_confirmations (inline on matches)

reports ──> profiles (reporter, reported)
blocks ──> profiles (blocker, blocked)
notification_queue (async dispatch)
```

---

## PostgreSQL Schema

### Extensions

```sql
create extension if not exists "pgcrypto";
create extension if not exists "pg_net";  -- optional: trigger → edge function HTTP
```

### Enums

```sql
create type user_role as enum ('candidate', 'employer');
create type job_type as enum ('casual', 'part_time', 'permanent');
create type job_status as enum ('active', 'hired', 'expired', 'paused');
create type swipe_direction as enum ('right', 'left');
create type match_status as enum ('chatting', 'hire_pending', 'hired', 'unmatched', 'archived');
create type notification_status as enum ('pending', 'processing', 'sent', 'failed');
create type report_reason as enum (
  'spam', 'harassment', 'misleading_job', 'inappropriate_content', 'other'
);
create type report_status as enum ('pending', 'reviewed', 'action_taken', 'dismissed');
```

---

### `profiles`

Core identity for all users. `id` matches `auth.users.id`.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | `uuid` | PK, FK → `auth.users(id)` ON DELETE CASCADE | Same as auth UID |
| `role` | `user_role` | NOT NULL after onboarding | Set during onboarding |
| `full_name` | `text` | NOT NULL after onboarding | Display name |
| `email` | `text` | NOT NULL | Synced from auth |
| `phone` | `text` | NULL | Optional contact |
| `suburb` | `text` | NOT NULL after onboarding | Beachhead suburb |
| `avatar_url` | `text` | NULL | Supabase Storage URL |
| `experience_text` | `text` | NULL | Candidates only |
| `skills` | `text[]` | DEFAULT `'{}'` | Max 5 enforced in app |
| `availability_text` | `text` | NULL | Candidates only |
| `work_rights` | `text` | NULL | e.g. `citizen`, `pr`, `visa_student_20hr` |
| `onboarding_completed_at` | `timestamptz` | NULL | Gate for main app |
| `created_at` | `timestamptz` | NOT NULL DEFAULT `now()` | |
| `updated_at` | `timestamptz` | NOT NULL DEFAULT `now()` | |

**Indexes**

```sql
create index profiles_role_idx on profiles (role);
create index profiles_suburb_idx on profiles (suburb);
```

---

### `employer_profiles`

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `profile_id` | `uuid` | PK, FK → `profiles(id)` ON DELETE CASCADE | |
| `business_name` | `text` | NOT NULL | |
| `about_text` | `text` | NULL | |
| `contact_name` | `text` | NULL | |
| `verified` | `boolean` | NOT NULL DEFAULT `false` | Manual/admin verify post-MVP |
| `created_at` | `timestamptz` | NOT NULL DEFAULT `now()` | |
| `updated_at` | `timestamptz` | NOT NULL DEFAULT `now()` | |

---

### `circles`

Geographic beachhead grouping. MVP: one seeded circle.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | `uuid` | PK DEFAULT `gen_random_uuid()` | |
| `name` | `text` | NOT NULL | e.g. "Northern Melbourne" |
| `suburb_anchor` | `text` | NOT NULL | e.g. "Tullamarine" |
| `is_default` | `boolean` | NOT NULL DEFAULT `false` | Auto-assign on signup |
| `created_at` | `timestamptz` | NOT NULL DEFAULT `now()` | |

---

### `circle_members`

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `profile_id` | `uuid` | FK → `profiles(id)` ON DELETE CASCADE | |
| `circle_id` | `uuid` | FK → `circles(id)` ON DELETE CASCADE | |
| `joined_at` | `timestamptz` | NOT NULL DEFAULT `now()` | |
| | | PRIMARY KEY (`profile_id`, `circle_id`) | |

---

### `jobs`

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | `uuid` | PK DEFAULT `gen_random_uuid()` | |
| `employer_id` | `uuid` | NOT NULL, FK → `profiles(id)` | Must be employer role |
| `circle_id` | `uuid` | NOT NULL, FK → `circles(id)` | Job visible in circle |
| `title` | `text` | NOT NULL | |
| `job_type` | `job_type` | NOT NULL | |
| `pay_display` | `text` | NOT NULL | Card display: "$32/hr" |
| `pay_amount` | `numeric(10,2)` | NOT NULL | For validation |
| `pay_period` | `text` | NOT NULL CHECK (`pay_period` IN ('hour','week','year')) | |
| `hours_text` | `text` | NOT NULL | e.g. "Sat 8am-2pm" |
| `suburb` | `text` | NOT NULL | |
| `description` | `text` | NULL | |
| `photo_url` | `text` | NULL | Single hero photo MVP |
| `status` | `job_status` | NOT NULL DEFAULT `'active'` | |
| `expires_at` | `timestamptz` | NOT NULL | Default: `created_at + 30 days` |
| `hired_at` | `timestamptz` | NULL | Set when both parties confirm hire |
| `created_at` | `timestamptz` | NOT NULL DEFAULT `now()` | |
| `updated_at` | `timestamptz` | NOT NULL DEFAULT `now()` | |

**Indexes**

```sql
create index jobs_circle_status_idx on jobs (circle_id, status, created_at desc);
create index jobs_employer_idx on jobs (employer_id, status);
create index jobs_expires_at_idx on jobs (expires_at) where status = 'active';
```

---

### `swipes`

Candidate interest on jobs. Employers read swipes on their jobs via RLS (audit fix).

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | `uuid` | PK DEFAULT `gen_random_uuid()` | |
| `candidate_id` | `uuid` | NOT NULL, FK → `profiles(id)` | |
| `job_id` | `uuid` | NOT NULL, FK → `jobs(id)` ON DELETE CASCADE | |
| `direction` | `swipe_direction` | NOT NULL | `right` = interested |
| `created_at` | `timestamptz` | NOT NULL DEFAULT `now()` | |

**Constraints**

```sql
alter table swipes add constraint swipes_unique_candidate_job unique (candidate_id, job_id);
create index swipes_job_direction_idx on swipes (job_id, direction, created_at desc);
create index swipes_candidate_idx on swipes (candidate_id, created_at desc);
```

---

### `matches`

Created when employer taps **Chat** on an interested candidate.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | `uuid` | PK DEFAULT `gen_random_uuid()` | |
| `job_id` | `uuid` | NOT NULL, FK → `jobs(id)` | |
| `candidate_id` | `uuid` | NOT NULL, FK → `profiles(id)` | |
| `employer_id` | `uuid` | NOT NULL, FK → `profiles(id)` | Denormalized for RLS |
| `status` | `match_status` | NOT NULL DEFAULT `'chatting'` | |
| `initiated_by` | `uuid` | NOT NULL, FK → `profiles(id)` | Always employer in MVP |
| `candidate_hire_confirmed` | `boolean` | NOT NULL DEFAULT `false` | |
| `employer_hire_confirmed` | `boolean` | NOT NULL DEFAULT `false` | |
| `hire_initiated_by` | `uuid` | NULL, FK → `profiles(id)` | First "Hired" tap |
| `hire_initiated_at` | `timestamptz` | NULL | |
| `hired_at` | `timestamptz` | NULL | Both confirmed |
| `unmatched_at` | `timestamptz` | NULL | |
| `unmatched_by` | `uuid` | NULL | |
| `created_at` | `timestamptz` | NOT NULL DEFAULT `now()` | |
| `updated_at` | `timestamptz` | NOT NULL DEFAULT `now()` | |

**Constraints (race-condition fix)**

```sql
alter table matches add constraint matches_unique_job_candidate unique (job_id, candidate_id);
create index matches_candidate_status_idx on matches (candidate_id, status, created_at desc);
create index matches_employer_status_idx on matches (employer_id, status, created_at desc);
```

---

### `messages`

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | `uuid` | PK DEFAULT `gen_random_uuid()` | |
| `match_id` | `uuid` | NOT NULL, FK → `matches(id)` ON DELETE CASCADE | |
| `sender_id` | `uuid` | NOT NULL, FK → `profiles(id)` | |
| `body` | `text` | NOT NULL CHECK (char_length(`body`) <= 4000) | Text only v1 |
| `created_at` | `timestamptz` | NOT NULL DEFAULT `now()` | |

```sql
create index messages_match_created_idx on messages (match_id, created_at);
```

---

### `device_tokens`

Expo push tokens (multiple devices per user).

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | `uuid` | PK DEFAULT `gen_random_uuid()` | |
| `profile_id` | `uuid` | NOT NULL, FK → `profiles(id)` ON DELETE CASCADE | |
| `expo_push_token` | `text` | NOT NULL | `ExponentPushToken[...]` |
| `platform` | `text` | NOT NULL CHECK (`platform` IN ('ios','android')) | |
| `created_at` | `timestamptz` | NOT NULL DEFAULT `now()` | |
| `last_used_at` | `timestamptz` | NOT NULL DEFAULT `now()` | |

```sql
alter table device_tokens add constraint device_tokens_unique unique (expo_push_token);
create index device_tokens_profile_idx on device_tokens (profile_id);
```

---

### `notification_preferences`

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `profile_id` | `uuid` | PK, FK → `profiles(id)` ON DELETE CASCADE | |
| `matches_push` | `boolean` | NOT NULL DEFAULT `true` | Cannot disable in UI for matches |
| `messages_push` | `boolean` | NOT NULL DEFAULT `true` | |
| `interest_push` | `boolean` | NOT NULL DEFAULT `true` | Employer: someone swiped right |
| `hire_push` | `boolean` | NOT NULL DEFAULT `true` | |
| `email_fallback` | `boolean` | NOT NULL DEFAULT `true` | Resend after 2h |
| `updated_at` | `timestamptz` | NOT NULL DEFAULT `now()` | |

---

### `notification_queue`

Persistent buffer for reliable notification dispatch ([`ARCHITECTURE_AUDIT.md`](../ARCHITECTURE_AUDIT.md) CRITICAL-2).

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | `uuid` | PK DEFAULT `gen_random_uuid()` | |
| `type` | `text` | NOT NULL | See § Edge Functions |
| `idempotency_key` | `text` | NOT NULL | e.g. `match:{match_id}:push` |
| `payload` | `jsonb` | NOT NULL | |
| `status` | `notification_status` | NOT NULL DEFAULT `'pending'` | |
| `attempts` | `int` | NOT NULL DEFAULT `0` | Max 3 |
| `last_error` | `text` | NULL | |
| `created_at` | `timestamptz` | NOT NULL DEFAULT `now()` | |
| `processed_at` | `timestamptz` | NULL | |

```sql
alter table notification_queue add constraint notification_queue_idempotency unique (idempotency_key);
create index notification_queue_pending_idx on notification_queue (status, created_at)
  where status = 'pending';
```

---

### `reports`

App Store moderation requirement.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | `uuid` | PK DEFAULT `gen_random_uuid()` | |
| `reporter_id` | `uuid` | NOT NULL, FK → `profiles(id)` | |
| `reported_id` | `uuid` | NOT NULL, FK → `profiles(id)` | |
| `job_id` | `uuid` | NULL, FK → `jobs(id)` | Context |
| `match_id` | `uuid` | NULL, FK → `matches(id)` | Context |
| `reason` | `report_reason` | NOT NULL | |
| `details` | `text` | NULL | |
| `status` | `report_status` | NOT NULL DEFAULT `'pending'` | |
| `created_at` | `timestamptz` | NOT NULL DEFAULT `now()` | |

---

### `blocks`

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `blocker_id` | `uuid` | FK → `profiles(id)` ON DELETE CASCADE | |
| `blocked_id` | `uuid` | FK → `profiles(id)` ON DELETE CASCADE | |
| `created_at` | `timestamptz` | NOT NULL DEFAULT `now()` | |
| | | PRIMARY KEY (`blocker_id`, `blocked_id`) | |

Blocked users must not appear in decks, interested lists, or chat.

---

## Database Functions & Triggers

### Auto-create profile on signup

```sql
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, created_at, updated_at)
  values (new.id, new.email, now(), now())
  on conflict (id) do nothing;

  insert into public.notification_preferences (profile_id)
  values (new.id)
  on conflict (profile_id) do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
```

### Auto-assign default circle on onboarding

```sql
create or replace function public.assign_default_circle()
returns trigger
language plpgsql
security definer
as $$
declare
  default_circle uuid;
begin
  if new.onboarding_completed_at is not null
     and (old.onboarding_completed_at is null) then
    select id into default_circle from circles where is_default = true limit 1;
    if default_circle is not null then
      insert into circle_members (profile_id, circle_id)
      values (new.id, default_circle)
      on conflict do nothing;
    end if;
  end if;
  return new;
end;
$$;

create trigger on_profile_onboarding_complete
  after update on profiles
  for each row execute function public.assign_default_circle();
```

### Enqueue notification on swipe right (employer interest alert)

```sql
create or replace function public.enqueue_interest_notification()
returns trigger
language plpgsql
security definer
as $$
declare
  v_employer_id uuid;
begin
  if new.direction = 'right' then
    select employer_id into v_employer_id from jobs where id = new.job_id;
    insert into notification_queue (type, idempotency_key, payload)
    values (
      'interest_received',
      'interest:' || new.id::text,
      jsonb_build_object(
        'swipe_id', new.id,
        'job_id', new.job_id,
        'candidate_id', new.candidate_id,
        'employer_id', v_employer_id
      )
    )
    on conflict (idempotency_key) do nothing;
  end if;
  return new;
end;
$$;

create trigger on_swipe_right_notify
  after insert on swipes
  for each row execute function public.enqueue_interest_notification();
```

### Enqueue notification on match insert

```sql
create or replace function public.enqueue_match_notification()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into notification_queue (type, idempotency_key, payload)
  values (
    'match_created',
    'match:' || new.id::text || ':push',
    jsonb_build_object(
      'match_id', new.id,
      'job_id', new.job_id,
      'candidate_id', new.candidate_id,
      'employer_id', new.employer_id
    )
  )
  on conflict (idempotency_key) do nothing;
  return new;
end;
$$;

create trigger on_match_created_notify
  after insert on matches
  for each row execute function public.enqueue_match_notification();
```

### Enqueue notification on new message

```sql
create or replace function public.enqueue_message_notification()
returns trigger
language plpgsql
security definer
as $$
declare
  v_match matches%rowtype;
  v_recipient uuid;
begin
  select * into v_match from matches where id = new.match_id;
  if v_match.candidate_id = new.sender_id then
    v_recipient := v_match.employer_id;
  else
    v_recipient := v_match.candidate_id;
  end if;

  insert into notification_queue (type, idempotency_key, payload)
  values (
    'message_received',
    'message:' || new.id::text,
    jsonb_build_object(
      'message_id', new.id,
      'match_id', new.match_id,
      'sender_id', new.sender_id,
      'recipient_id', v_recipient,
      'preview', left(new.body, 120)
    )
  )
  on conflict (idempotency_key) do nothing;
  return new;
end;
$$;

create trigger on_message_created_notify
  after insert on messages
  for each row execute function public.enqueue_message_notification();
```

### `updated_at` helper

```sql
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Apply to: profiles, employer_profiles, jobs, matches
```

---

## Match Logic Flow

MVP flow (employer-initiated). Addresses race/idempotency from [`ARCHITECTURE_AUDIT.md`](../ARCHITECTURE_AUDIT.md).

### 1. Candidate swipes on job

```
Client (optimistic UI)
  → INSERT swipes (candidate_id, job_id, direction)
  → ON CONFLICT (candidate_id, job_id) DO UPDATE SET direction = EXCLUDED.direction
```

RLS: candidate can insert/update own swipes. Left swipes hide job from deck (client filters); row retained for analytics.

### 2. Employer views Interested List

```
SELECT s.*, p.*
FROM swipes s
JOIN profiles p ON p.id = s.candidate_id
JOIN jobs j ON j.id = s.job_id
WHERE j.employer_id = auth.uid()
  AND s.direction = 'right'
  AND s.job_id = :job_id
  AND NOT EXISTS (
    SELECT 1 FROM matches m
    WHERE m.job_id = s.job_id AND m.candidate_id = s.candidate_id
  )
  AND NOT EXISTS (
    SELECT 1 FROM blocks b
    WHERE (b.blocker_id = auth.uid() AND b.blocked_id = s.candidate_id)
       OR (b.blocker_id = s.candidate_id AND b.blocked_id = auth.uid())
  );
```

RLS: employer read policy on `swipes` (see matrix below).

### 3. Employer taps Chat → create match

**Preferred: Postgres RPC** (atomic, single round-trip)

```sql
create or replace function public.create_match(p_job_id uuid, p_candidate_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_job jobs%rowtype;
  v_match_id uuid;
begin
  select * into v_job from jobs
  where id = p_job_id and employer_id = auth.uid() and status = 'active';

  if not found then
    raise exception 'JOB_NOT_FOUND_OR_FORBIDDEN';
  end if;

  if not exists (
    select 1 from swipes
    where job_id = p_job_id
      and candidate_id = p_candidate_id
      and direction = 'right'
  ) then
    raise exception 'CANDIDATE_NOT_INTERESTED';
  end if;

  insert into matches (job_id, candidate_id, employer_id, initiated_by)
  values (p_job_id, p_candidate_id, v_job.employer_id, auth.uid())
  on conflict (job_id, candidate_id) do update
    set updated_at = now()
  returning id into v_match_id;

  return v_match_id;
end;
$$;
```

**Race handling:** `UNIQUE(job_id, candidate_id)` + `ON CONFLICT` ensures double-tap returns same match. Trigger enqueues notification once via idempotency key.

**No `check-match` Edge Function** — bilateral reciprocal swipe is out of scope for MVP.

### 4. Hire confirmation (dual confirm)

```
Party A taps "Hired"
  → UPDATE matches SET
       hire_initiated_by = auth.uid(),
       hire_initiated_at = now(),
       status = 'hire_pending',
       candidate_hire_confirmed = (auth.uid() = candidate_id),
       employer_hire_confirmed = (auth.uid() = employer_id)

Party B confirms
  → UPDATE both *_hire_confirmed = true
  → IF both true:
       status = 'hired', hired_at = now()
       UPDATE jobs SET status = 'hired', hired_at = now() WHERE id = job_id
       enqueue notification type = 'hire_confirmed'
```

Implement as RPC `confirm_hire(p_match_id uuid)` with authorization check.

### 5. Unmatch

```
UPDATE matches SET status = 'unmatched', unmatched_at = now(), unmatched_by = auth.uid()
WHERE id = :match_id AND (candidate_id = auth.uid() OR employer_id = auth.uid());
```

Chat read-only after unmatch. Parties hidden from each other for that job.

---

## RLS Policy Matrix

Enable RLS on all tables below. Service role bypasses for Edge Functions only.

| Table | Candidate SELECT | Candidate INSERT | Candidate UPDATE | Candidate DELETE | Employer SELECT | Employer INSERT | Employer UPDATE | Employer DELETE |
|-------|------------------|------------------|------------------|------------------|-----------------|-----------------|-----------------|-----------------|
| `profiles` | own + matched/chat counterpart basic fields | — | own | — | own + interested candidates† | — | own | — |
| `employer_profiles` | all (public business info) | — | — | — | own | own (onboarding) | own | — |
| `circles` | members | — | — | — | members | — | — | — |
| `circle_members` | own | — | — | — | own | — | — | — |
| `jobs` | active in user's circles | — | — | — | own + active in circle | create (own) | own | own (soft via status) |
| `swipes` | own | own | own | — | on own jobs (direction=right) | — | — | — |
| `matches` | own | via RPC only | own hire flags | — | own | via RPC only | own hire flags | — |
| `messages` | own matches | own matches | — | — | own matches | own matches | — | — |
| `device_tokens` | own | own | own | own | own | own | own | own |
| `notification_preferences` | own | auto | own | — | own | auto | own | — |
| `notification_queue` | — | — | — | — | — | — | — | — |
| `reports` | own submitted | own | — | — | own submitted | own | — | — |
| `blocks` | own | own | — | own | own | own | — | own |

† Use a `profiles_public` view exposing only: `id`, `full_name`, `avatar_url`, `suburb`, `experience_text`, `skills`, `availability_text`, `work_rights` for users in active matches or interested lists.

`notification_queue`: **no client access** — service role only.

### Example policies

```sql
-- profiles: own row
create policy "profiles_select_own" on profiles for select using (id = auth.uid());
create policy "profiles_update_own" on profiles for update using (id = auth.uid());

-- jobs: candidates read active jobs in their circles
create policy "jobs_select_candidates" on jobs for select using (
  status = 'active'
  and circle_id in (
    select circle_id from circle_members where profile_id = auth.uid()
  )
);

create policy "jobs_all_employer" on jobs for all using (employer_id = auth.uid())
  with check (employer_id = auth.uid());

-- swipes: candidate write own; employer read interested
create policy "swipes_insert_candidate" on swipes for insert
  with check (candidate_id = auth.uid());

create policy "swipes_select_own" on swipes for select
  using (candidate_id = auth.uid());

create policy "swipes_select_employer" on swipes for select using (
  exists (
    select 1 from jobs j
    where j.id = swipes.job_id
      and j.employer_id = auth.uid()
  )
);

-- matches: participants
create policy "matches_select" on matches for select using (
  candidate_id = auth.uid() or employer_id = auth.uid()
);

create policy "matches_update" on matches for update using (
  candidate_id = auth.uid() or employer_id = auth.uid()
);

-- messages: match participants
create policy "messages_all" on messages for all using (
  exists (
    select 1 from matches m
    where m.id = match_id
      and (m.candidate_id = auth.uid() or m.employer_id = auth.uid())
  )
) with check (
  sender_id = auth.uid()
  and exists (
    select 1 from matches m
    where m.id = match_id
      and (m.candidate_id = auth.uid() or m.employer_id = auth.uid())
      and m.status in ('chatting', 'hire_pending')
  )
);
```

---

## Edge Functions

| Function | Trigger | Idempotency |
|----------|---------|-------------|
| `notification-processor` | Cron every 1 min + manual invoke | Checks `notification_queue.idempotency_key` + status |
| `expire-jobs` | Cron daily 00:00 Australia/Melbourne | `job:expire:{job_id}` log or status gate |
| `moderation-ingest` | HTTP POST from mobile | `report:{report_id}` |

### `notification-processor`

**Input:** none (batch) or `{ queue_id?: uuid }`

**Logic:**
1. Select up to 50 rows where `status = 'pending'` AND `attempts < 3`
2. For each row, switch on `type`:

| type | Actions |
|------|---------|
| `interest_received` | Push to employer: "Someone's interested in [job title]" |
| `match_created` | Push to candidate + employer; Realtime broadcast |
| `message_received` | Push to recipient with preview |
| `hire_confirmed` | Push to both parties |

3. Fetch `device_tokens` for recipient(s)
4. Send via [Expo Push API](https://docs.expo.dev/push-notifications/sending-notifications/)
5. Mark `sent` or increment `attempts` on failure
6. If `email_fallback` and push not opened within 2h → enqueue `email:*` (processed by same function via Resend)

**Output:** `{ processed: number, failed: number }`

**Idempotency:** Unique `idempotency_key` on queue insert. Processor skips rows already `sent`.

### `expire-jobs`

**Logic:**
```sql
UPDATE jobs SET status = 'expired', updated_at = now()
WHERE status = 'active' AND expires_at < now();
```

Optional: notify employers with active interested swipes.

### `moderation-ingest`

**Input:**
```json
{
  "reported_id": "uuid",
  "job_id": "uuid | null",
  "match_id": "uuid | null",
  "reason": "spam | harassment | ...",
  "details": "string | null"
}
```

**Output:** `{ "report_id": "uuid" }`

Inserts into `reports` with service role. MVP: manual review via Supabase dashboard; admin UI post-MVP.

---

## Realtime Channels

Naming convention: `{scope}:{entity_id}`

| Channel | Events | Subscribers |
|---------|--------|-------------|
| `match:{match_id}` | `postgres_changes` on `messages` INSERT | Match participants |
| `inbox:{profile_id}` | `postgres_changes` on `matches` INSERT/UPDATE | Candidate or employer |
| `employer:{profile_id}:jobs` | `postgres_changes` on `swipes` INSERT | Employer (new interest) |

**Broadcast** (optional enhancement):

```typescript
// Server-side after match created
supabase.channel(`inbox:${candidateId}`).send({
  type: 'broadcast',
  event: 'match_created',
  payload: { match_id, job_id },
});
```

Prefer `postgres_changes` for MVP simplicity.

---

## Storage Buckets

| Bucket | Public | Max size | MIME | Path pattern |
|--------|--------|----------|------|--------------|
| `avatars` | yes | 5 MB | jpeg, png, webp | `{profile_id}/{timestamp}.jpg` |
| `job-photos` | yes | 5 MB | jpeg, png, webp | `{employer_id}/{job_id}/{timestamp}.jpg` |

### Storage RLS (policies)

```sql
-- avatars: owner write, public read
-- job-photos: employer write own prefix, public read
```

**Image constraints (app-enforced):** min 400×400 avatars; min 800×600 job photos. Use Supabase image transforms: `?width=400&quality=75`.

---

## Job Ingestion v1

MVP accepts **manual seeding only** — no scraping, no Adzuna API.

### Seed strategy

1. Create default `circles` row for Northern Melbourne beachhead
2. Seed 20–30 realistic jobs via `supabase/seed/beachhead_jobs.sql`
3. Create 3–5 demo employer accounts (test auth users + `employer_profiles`)
4. Operators post real jobs via employer onboarding in app

### Job creation paths (MVP)

| Path | Who | Method |
|------|-----|--------|
| In-app | Employer | Mobile app Post Job form |
| Seed script | Developer | SQL seed |
| Admin CSV import | Deferred | post-MVP admin web |

### Validation on publish

- `pay_amount` ≥ Fair Work minimum for category (app-side lookup per [`GUARDRAILS.md`](../GUARDRAILS.md))
- `expires_at` default 30 days from publish
- Employer must have completed `employer_profiles` row

---

## Moderation & Reporting API Sketch

Mobile calls Supabase directly (RLS) for MVP; optional Edge Function wrapper.

### Report user

```
POST /rest/v1/reports
Authorization: Bearer {user_jwt}
Body: { reported_id, job_id?, match_id?, reason, details? }
```

RLS: `reporter_id = auth.uid()`.

### Block user

```
POST /rest/v1/blocks
Body: { blocked_id: uuid }
```

Effects (enforced in queries + optional DB views):
- Remove from interested lists and decks
- Prevent new matches
- Existing match → force unmatch or read-only archive (app policy: read-only)

### App Store compliance checklist

- [ ] Report flow accessible from profile, chat, job detail
- [ ] Block flow accessible from profile and chat
- [ ] Privacy policy URL live
- [ ] UGC moderation SLA documented (review within 24h)

---

## Migration Order

Run in this sequence:

| # | File | Contents |
|---|------|----------|
| 1 | `202605270001_extensions.sql` | Extensions |
| 2 | `202605270002_enums.sql` | All enums |
| 3 | `202605270003_profiles.sql` | `profiles`, `handle_new_user` trigger |
| 4 | `202605270004_employer_profiles.sql` | `employer_profiles` |
| 5 | `202605270005_circles.sql` | `circles`, `circle_members`, default circle seed |
| 6 | `202605270006_jobs.sql` | `jobs`, indexes |
| 7 | `202605270007_swipes.sql` | `swipes`, interest notification trigger |
| 8 | `202605270008_matches.sql` | `matches`, unique constraint, `create_match` RPC |
| 9 | `202605270009_messages.sql` | `messages`, message notification trigger |
| 10 | `202605270010_device_tokens.sql` | `device_tokens` |
| 11 | `202605270011_notification_prefs_queue.sql` | preferences + queue + match trigger |
| 12 | `202605270012_reports_blocks.sql` | moderation tables |
| 13 | `202605270013_rls.sql` | All RLS policies |
| 14 | `202605270014_storage.sql` | Buckets + storage policies |
| 15 | `202605270015_rpcs.sql` | `confirm_hire`, `unmatch`, helper RPCs |
| 16 | `202605270016_seed.sql` | Beachhead jobs (dev/staging only) |

After migrations: deploy Edge Functions `notification-processor`, `expire-jobs`. Schedule crons in Supabase dashboard.

---

## Post-MVP Schema (do not migrate yet)

Reserved for future phases — document only:

- `providers`, `caseloads`, `compliance_reports` — partnership phase
- `job_boosts`, `stripe_customers` — monetization
- `applications` separate from swipes — if multi-step apply returns
- `streaks` — gamification

---

## Related Docs

- Stack: [`../STACK.md`](../STACK.md)
- Auth (adapt for Expo): [`../AUTH_FLOWS.md`](../AUTH_FLOWS.md)
- Notifications detail: [`../NOTIFICATIONS.md`](../NOTIFICATIONS.md)
- Architecture audit fixes: [`../ARCHITECTURE_AUDIT.md`](../ARCHITECTURE_AUDIT.md)
- MVP scope: [`../foundational-docs/02-mvp-definition.md`](../foundational-docs/02-mvp-definition.md)
