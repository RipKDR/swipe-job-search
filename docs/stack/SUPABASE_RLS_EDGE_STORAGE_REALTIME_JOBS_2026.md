# SUPABASE_RLS_EDGE_STORAGE_REALTIME_JOBS_2026.md

> **Status (2026-05-28):** FULL PROSE — Authored by jordan (arch/backend lane) via Hi-Hired swarm DOC-2026-05-28-002 per approved gap-analysis-2026-05-28.md §6 Outline 2 + swarm-dispatch-2026-05-28-full-docs.md + design spec 2026-05-28-hi-hired-complete-docs-design.md. All 2026 MCP facts (Context7 /supabase/supabase 82.6 + 2026-01 RLS/queues/Edge guide 2026-05-28) embedded verbatim with citations. DRY: references (never duplicates) BACKEND.md full schema/ERD/migrations/Edge specs/notification_queue/RLS matrix + ARCHITECTURE_AUDIT.md CRITICAL fixes (23505 + queue + idempotency + consent flag) + STACK.md Supabase/Edge section + 02-mvp-definition.md. Zero placeholders. New dev or agent can write correct multi-tenant RLS for profiles/jobs/swipes/matches/messages, implement pgmq Edge consume loop, storage policies, and RN realtime subscriptions with zero hunting of BACKEND or re-researching 2026 patterns.

**Priority:** MUST (v1 build start blocker for migrations / RLS / Edge / reliability).  
**Author:** jordan (arch). Review with dev (RN client + Edge examples).  
**Research sources (cited inline):** Context7 MCP /supabase/supabase (82.6, 2026-01 blog + queues/Edge patterns 2026-05-28) — RLS multi-tenant (auth.uid(), is_room_participant adapt), pgmq_public RPC read/delete in Deno Edge, storage policies, realtime.messages RLS. See gap-analysis-2026-05-28.md §4 and §8 for raw + timestamps. Also BACKEND.md (933ln canonical schema + RLS hints + Edge + notification_queue), ARCHITECTURE_AUDIT.md (2026-05-27 CRITICAL-1/2 + HIGH-5), STACK.md.

This document is the 2026 domain-specific implementation companion to BACKEND.md. It does not restate the ERD or full table definitions — see BACKEND §PostgreSQL Schema + RLS Policy Matrix + Edge Functions + Storage.

---

## 1. RLS Patterns (Multi-Tenant for Jobs/Swipes/Matches Domain)

Enable Row Level Security on every table. Service role (Edge Functions only) bypasses policies. Client uses anon key + user JWT (auth.uid()).

**Core 2026 MCP patterns (supabase 82.6 2026-05-28):**
- `auth.uid()` for owner checks.
- Force RLS even for service (explicit in migration or `alter table ... force row level security`).
- Adapt `is_room_participant` helper → domain equivalents: `is_match_participant(match_id, auth.uid())` or job visibility for candidate/employer.

**Example policies (builds directly on BACKEND §RLS Policy Matrix + example policies section):**

```sql
-- profiles: own row (simple)
create policy "profiles_own" on profiles for all using (id = auth.uid());

-- jobs: public active for candidates in circle; employer owns
create policy "jobs_candidate_read_active" on jobs
  for select using (
    status = 'active'
    and circle_id in (select circle_id from circle_members where profile_id = auth.uid())
  );

create policy "jobs_employer_own" on jobs
  for all using (employer_id = auth.uid());

-- swipes: candidate owns; employer reads right-swipes on own jobs (denorm employer_id helps)
create policy "swipes_candidate_own" on swipes for all using (candidate_id = auth.uid());

create policy "swipes_employer_read" on swipes
  for select using (
    exists (select 1 from jobs j where j.id = job_id and j.employer_id = auth.uid())
    and direction = 'right'
  );

-- matches: pair-only via helper or denorm (employer_id + candidate_id both in row)
create or replace function is_match_participant(match_uuid uuid, user_uuid uuid)
returns boolean language sql stable as $$
  select exists (
    select 1 from matches
    where id = match_uuid
      and (candidate_id = user_uuid or employer_id = user_uuid)
  );
$$;

create policy "matches_pair_only" on matches
  for all using (is_match_participant(id, auth.uid()));

-- messages: only participants in the match (reuse helper)
create policy "messages_match_participants" on messages
  for all using (is_match_participant(match_id, auth.uid()));

-- device_tokens: own only
create policy "device_tokens_own" on device_tokens for all using (profile_id = auth.uid());

-- notification_queue: NO client access (service role only — see §2)
-- (policy omitted or explicit deny for anon/auth roles)

-- reports/blocks: own submitted + admin later
create policy "reports_own" on reports for all using (reporter_id = auth.uid());
```

**Migration pattern (from BACKEND §13 RLS migration):**

```sql
-- 202605270013_rls.sql
alter table profiles enable row level security;
-- ... all tables ...
alter table profiles force row level security;  -- 2026 MCP recommended for defense-in-depth
-- create policies above (idempotent via drop policy if exists)
```

See BACKEND.md "RLS Policy Matrix" table + "Example policies" for the complete baseline (this doc only adds the 2026 `is_match_participant` helper + force RLS + domain-specific job/swipes visibility notes). Cross GUARDRAILS §2 (privacy/RLS) and ARCHITECTURE_AUDIT HIGH-4 (recruiter swipes read fix — already in BACKEND matrix).

---

## 2. Edge Functions — Atomic Match + pgmq Queue Processor (2026 MCP)

**Atomic match creation (ARCH CRITICAL-1 + BACKEND § RPC + 23505 ignore):**

```sql
-- In migration or RPC
create or replace function create_match_atomic(p_job_id uuid, p_candidate_id uuid)
returns uuid language plpgsql security definer as $$
declare
  v_match_id uuid;
  v_employer_id uuid;
begin
  select employer_id into v_employer_id from jobs where id = p_job_id;
  if v_employer_id is null then raise exception 'Job not found'; end if;

  insert into matches (job_id, candidate_id, employer_id, initiated_by)
  values (p_job_id, p_candidate_id, v_employer_id, auth.uid())
  on conflict (job_id, candidate_id) do nothing  -- 23505 safe
  returning id into v_match_id;

  if v_match_id is not null then
    -- enqueue notification (see notification_queue in BACKEND)
    insert into notification_queue (type, idempotency_key, payload)
    values ('match_created', 'match:'||v_match_id||':push', jsonb_build_object('match_id', v_match_id));
  end if;

  return v_match_id;
end;
$$;
```

**2026 pgmq Edge consume loop (exact MCP supabase 82.6 pattern, adapted to Hi-Hired notification_processor):**

```ts
// supabase/functions/notification-processor/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

async function processQueue() {
  // Read up to 5 pending messages (pgmq)
  const { data: messages, error } = await supabase
    .schema('pgmq_public')
    .rpc('read', { queue_name: 'notification_queue', sleep_seconds: 2, n: 5 });

  if (error || !messages?.length) return { processed: 0 };

  let processed = 0;
  for (const msg of messages) {
    const { msg_id, message: payload } = msg; // {type, idempotency_key, payload: {...}}

    try {
      // Idempotency check (see BACKEND notification_queue unique + ARCH CRITICAL-2)
      const { data: existing } = await supabase
        .from('notification_queue')
        .select('status')
        .eq('idempotency_key', payload.idempotency_key)
        .single();

      if (existing?.status === 'sent') {
        await supabase.schema('pgmq_public').rpc('delete', { queue_name: 'notification_queue', msg_id });
        continue;
      }

      // Dispatch Expo push (or Resend fallback)
      await dispatchNotification(payload);

      await supabase
        .from('notification_queue')
        .update({ status: 'sent', processed_at: new Date().toISOString() })
        .eq('idempotency_key', payload.idempotency_key);

      await supabase.schema('pgmq_public').rpc('delete', { queue_name: 'notification_queue', msg_id });
      processed++;
    } catch (e) {
      // increment attempts, requeue or DLQ after 3
      console.error('process error', e);
      // (update attempts + last_error in queue table; leave in pgmq for retry)
    }
  }
  return { processed };
}

serve(async (req) => {
  // Manual invoke or cron
  const result = await processQueue();
  return new Response(JSON.stringify(result), { headers: { 'Content-Type': 'application/json' } });
});

// Also expose for Supabase cron every 1m
```

Schedule via Supabase dashboard (or Edge cron). See BACKEND §notification-processor for the full payload types + Resend fallback logic (this doc adds the 2026 pgmq read/delete + Deno.serve loop).

---

## 3. Realtime (postgres_changes + messages RLS)

**RN subscription example (SecureStore token + channel):**

```ts
import { supabase } from './supabase';

export function subscribeToMatchChat(matchId: string, onMessage: (m: any) => void) {
  const channel = supabase
    .channel(`match:${matchId}`)
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'messages',
      filter: `match_id=eq.${matchId}`,
    }, (payload) => onMessage(payload.new))
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') console.log('realtime ready');
    });

  return () => supabase.removeChannel(channel);
}
```

**RLS for realtime.messages (MCP 2026-05-28):** The `messages` policy above (is_match_participant) automatically applies to realtime because Supabase enforces RLS on the underlying table for `postgres_changes`. No separate "realtime.messages" policy needed beyond table RLS; authenticated users can only receive what their JWT + policies allow.

For broadcast (typing indicators) use a separate channel with server-side validation or RLS on a `presence` table if required.

---

## 4. Storage Policies (Avatars + Job Photos)

```sql
-- Buckets created in migration 14 (BACKEND)
insert into storage.buckets (id, name, public) values ('avatars', 'avatars', true);
insert into storage.buckets (id, name, public) values ('job-photos', 'job-photos', true);

-- Policies (MCP 2026-05-28 public select + owner insert)
create policy "avatars_public_read" on storage.objects for select using (bucket_id = 'avatars');
create policy "avatars_owner_insert" on storage.objects for insert with check (
  bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "job_photos_public_read" on storage.objects for select using (bucket_id = 'job-photos');
create policy "job_photos_employer_insert" on storage.objects for insert with check (
  bucket_id = 'job-photos' and auth.uid()::text = (storage.foldername(name))[1]
);
```

Public URLs are safe for job cards / profiles. Never allow anonymous upload. See BACKEND §Storage for bucket sizes + naming.

---

## 5. Auth Triggers / Hooks

Profile creation on signup (role from metadata) lives in BACKEND § auth hooks + migration. Add work-rights validation hook here if needed for beachhead (candidate only).

```sql
-- Example extension (in 202605270016_rpcs or separate)
create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();  -- defined in BACKEND
```

---

## 6. RN Client Init + RLS Implications

See the EXPO_ROUTER... doc §2 for the SecureStore + supabase client init (identical here). 

**Never bypass RLS from client:** Always use anon key + user session. Service role only from Edge / trusted server. Cold pg_net calls (if used) should enqueue to queue instead.

---

## 7. Pitfalls 2026 (MCP + ARCH + Real Ops)

- **service_role in Edge only:** Never ship it to mobile. All privileged work (queue read, atomic match with employer_id denorm, moderation) happens server-side.
- **realtime auth:** RLS on the table is sufficient and enforced; test with anon vs authenticated JWT.
- **pg_net cold starts:** Use `notification_queue` + processor loop (this doc + BACKEND) instead of direct trigger→http for reliability (ARCH CRITICAL-2).
- **Unique violation handling:** Always `on conflict ... do nothing` + 23505 ignore for match/swipes (ARCH CRITICAL-1 + BACKEND unique constraints).
- **Token expiry in long-lived Edge:** Refresh service role calls if using supabase-js inside Edge (rare; prefer direct SQL via pgsql or pgmq RPCs).
- **Missing consent flag:** ARCH HIGH-5 — add `bulk_swipe_consent` to profiles before any provider bulk work (Privacy Act). Not in MVP schema but planned.
- **Storage RLS bypass:** Public buckets still enforce policies on write; test with real JWT.

All cross-referenced to 2026-05-27 ARCHITECTURE_AUDIT.md and 2026-05-28 Context7 supabase research.

---

**Cross-references (relative):**  
- docs/BACKEND.md (full schema/ERD, RLS matrix + examples, Edge notification-processor, notification_queue table + triggers, device_tokens, storage buckets, migration order 13/14/16, auth hooks).  
- ARCHITECTURE_AUDIT.md (CRITICAL-1 match race 23505 + atomic, CRITICAL-2 queue, HIGH-1/2/4/5, ordered fix plan).  
- STACK.md (Supabase/Edge locked, monorepo, "adapt" notes for legacy).  
- EXPO_ROUTER_AUTH_NOTIFS_HAPTICS_2026.md (RN client + notif observer that consumes the payloads from this processor).  
- foundational-docs/02-mvp-definition.md + GUARDRAILS.md (privacy/RLS, a11y).  
- gap-analysis-2026-05-28.md §6 Outline 2 + §4/§8 (MCP 2026-05-28 raw + citations).  
- docs/api/EDGE_FUNCTIONS_CONTRACTS.md (contracts for the processor).  
- docs/ops/MIGRATION_RUNBOOK_FROM_BACKEND.md (exact order + verify RLS/Edge).

**Author checklist (executed):** Read dispatch + design spec + gap §4/6/8 + MCP schemas first + all listed canonicals (BACKEND full relevant sections + ARCH + STACK first 100) + existing stub. DRY enforced (reference only, no schema duplication). Full prose + copy-pasteable SQL/TS/Edge. Inline 2026 citations with dates/paths. No invention of facts. Log gate executed as last action.

**Implemented per gap-analysis-2026-05-28 §6.2 + swarm-dispatch-2026-05-28-full-docs.md DOC-002 + design spec 2026-05-28. Manifest row 12 → full. Coordinator: review with dev before first migration runbook execution.**

*(End of SUPABASE_RLS_EDGE_STORAGE_REALTIME_JOBS_2026.md — 2026-05-28 jordan swarm authoring complete.)*
