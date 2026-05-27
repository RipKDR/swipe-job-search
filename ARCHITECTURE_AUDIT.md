# Architecture Audit — Swipe Job Search

Produced: 2026-05-27
Auditor: Claude Code (ecc:agent-architecture-audit)

---

## Executive Verdict

**Overall health:** Medium risk
**Primary failure mode:** Race condition in match detection + fire-and-forget notification pipeline with no retry
**Most urgent fix:** Add UNIQUE constraint on `matches(candidate_id, job_id)` and make `check-match` atomic before any code is written

---

## Critical Findings

### 🔴 CRITICAL 1 — Match Detection Race Condition (TOCTOU)
**Source:** `SPEC.md` — `check-match` Edge Function spec

The check-match logic reads "does a reciprocal swipe exist?" then separately inserts a match row. Two simultaneous right-swipes produce two concurrent Edge Function calls that both pass the check and both insert — creating duplicate matches. No `UNIQUE(candidate_id, job_id)` constraint is defined in the schema.

**Fix:**
```sql
ALTER TABLE matches ADD CONSTRAINT matches_unique UNIQUE (candidate_id, job_id);
```
```typescript
// Atomic upsert in check-match Edge Function
await supabase.from('matches')
  .upsert({ candidate_id, job_id }, { onConflict: 'candidate_id,job_id', ignoreDuplicates: true })
```

---

### 🔴 CRITICAL 2 — Notification Pipeline is Fire-and-Forget, No Retry
**Source:** `NOTIFICATIONS.md` — DB trigger → `net.http_post` → Edge Function

`pg_net` queues the HTTP call after transaction commit. If the Edge Function is cold, timing out, or returns non-2xx, the match notification is silently dropped. No retry queue, no dead-letter table. A match fires but neither party is notified.

**Fix:** Add a `notification_queue` table as persistent buffer:
```sql
CREATE TABLE notification_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL,
  payload jsonb NOT NULL,
  status text DEFAULT 'pending',
  attempts int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  processed_at timestamptz
);
```
DB trigger inserts a row. Cron Edge Function processes pending rows with up to 3 retries.

---

## High Findings

### 🟠 HIGH 1 — App Presence Detection is Unreliable
**Source:** `NOTIFICATIONS.md` §1

The spec routes to in-app only if user is "connected via Supabase Realtime." But Realtime tracks WebSocket connections, not foreground state — backgrounded iOS apps stay connected. Push notifications are suppressed for backgrounded users.

**Fix:** Always send push. Suppress system notification on the client using `AppState === 'active'` (Capacitor). Show in-app overlay instead.

---

### 🟠 HIGH 2 — No Idempotency on `match-notification` Edge Function
**Source:** `NOTIFICATIONS.md` §3

Supabase guarantees at-least-once delivery. If `match-notification` is called twice for the same `match_id`, two push notifications are sent to both users.

**Fix:** Check `notification_queue` for a prior `sent` entry for this `match_id` before dispatching.

---

### 🟠 HIGH 3 — Compliance Export Has No Partial-Failure Recovery
**Source:** `SPEC.md` §6 — `compliance-export` Edge Function

The function aggregates all candidates → generates full PDF → uploads → emails in one sequential flow. With 200+ candidates, any failure loses the entire Monday report. Providers miss their DSS window.

**Fix:** Persist per-candidate rows to `compliance_report_rows` table first. Generate PDF from persisted data (retry-safe). Track run status in `compliance_report_runs` table.

---

### 🟠 HIGH 4 — RLS Architectural Inconsistency: Recruiter Cannot Read Swipes Client-Side
**Source:** `SPEC.md` — swipes RLS policy

```sql
create policy "swipes_read" on swipes
  for select using (swiper_id = auth.uid());
```

Recruiters cannot query "which candidates swiped on my job" from the client. `check-match` works because it uses the service role key. Any client-side recruiter dashboard code querying swipes returns 0 rows silently.

**Fix:**
```sql
create policy "swipes_recruiter_read" on swipes
  for select using (
    exists (select 1 from jobs j where j.id = target_id and j.recruiter_id = auth.uid())
  );
```

---

### 🟠 HIGH 5 — Bulk-Swipe Consent Flag Undefined in Schema
**Source:** `plans/` Task 7, `RECRUITER_FLOW.md`

Task 7 references a "stored consent flag on candidate profile" for provider bulk-swipe but `profiles` schema has no `bulk_swipe_consent` field. Missing = Privacy Act violation at launch.

**Fix:** Add to profiles migration:
```sql
bulk_swipe_consent boolean DEFAULT false,
bulk_swipe_consent_at timestamptz
```
Add consent toggle to onboarding flow.

---

## Medium Findings

### 🟡 MEDIUM 1 — Streak Edge Function Write Amplification
**Source:** `SPEC.md` §6 — `update-streak`

Every swipe fires a DB trigger → Edge Function invocation. 20 rapid swipes = 20 cold-start invocations. 

**Fix:** Debounce in trigger: only fire if `updated_at` on `streaks` row is > 1 hour ago.

---

## Ordered Fix Plan

| # | Fix | When |
|---|-----|------|
| 1 | Add `UNIQUE(candidate_id, job_id)` to matches migration | Before writing any code |
| 2 | Add `notification_queue` table + cron retry Edge Function | Before writing any code |
| 3 | Replace Realtime-presence with client `AppState` for push suppression | During mobile implementation (Task 9) |
| 4 | Add idempotency check to `match-notification` Edge Function | During Task 7 |
| 5 | Add recruiter RLS read policy on swipes | During Task 6 (recruiter dashboard) |
| 6 | Add per-candidate persistence to compliance export + status tracking | During Task 7 |
| 7 | Add `bulk_swipe_consent` to profiles schema + onboarding | Before Task 7 ships |
| 8 | Debounce `update-streak` trigger to once per hour per user | During Task 8 |
