# EDGE_FUNCTIONS_CONTRACTS.md

**Status (2026-05-28):** FULL. Authored by jordan via swarm DOC-2026-05-28-006 per gap-analysis-2026-05-28.md §6 Outline 6 + docs/superpowers/specs/2026-05-28-hi-hired-complete-docs-design.md §5 (API Contracts) + docs/BACKEND.md § Edge Functions + § Match Logic Flow + § Database Functions & Triggers + ARCHITECTURE_AUDIT.md (2026-05-27 CRITICAL fixes) + STACK.md (2026-05-27). Extracted and formalized; no invention.

**Priority:** MUST (unblocks RN client calls to Edge + reliable notif pipeline before U1 smoke per 2026-05-27 plan).

**Owner:** jordan (primary). Dev (RN supabase-js client examples + error handling). Sam (integration test notes).

**DRY Rule:** Full logic, triggers, and schema live in `docs/BACKEND.md`. This file provides **contract surfaces** (inputs/outputs, TS types, error codes, rate limits, example invocations) so a new dev or Edge author implements without reverse-engineering the 933-line BACKEND or re-deriving ARCH idempotency/queue rules. Cross-reference heavily; never duplicate SQL or ERD.

**2026 Citations (verifiable):**
- BACKEND.md § Edge Functions / notification-processor / Match Logic Flow (2026-05-27): exact processor logic (batch 50, switch on type, Expo Push API fetch, Resend fallback, idempotency via queue key), `create_match` RPC atomicity.
- ARCHITECTURE_AUDIT.md (2026-05-27): CRITICAL-2 "fire-and-forget" fix → queue + processor + idempotency_key; no pg_net direct from triggers.
- gap-analysis-2026-05-28.md §6 Outline 6 + §8 (MCP Supabase Edge/queue patterns 2026-05-28 Context7 /supabase/supabase 82.6; local Read/Grep 2026-05-28).
- design spec §5 (2026-05-28).
- STACK.md § Architecture / Deployment (2026-05-27): Edge bundled with Supabase project; `supabase functions deploy`.
- docs/plans/2026-05-27-001 §R11 / U2 (2026-05-27): "Push notifications via Expo + notification_queue processor Edge Function"; "device token registration".
- No MCP re-calls or external invention for this pass.

---

## 1. Overview & Invocation Patterns

All Edge Functions are deployed to the linked Supabase project (`supabase functions deploy <name>`). Client (Expo RN) calls use `@supabase/supabase-js` `supabase.functions.invoke(name, { body, headers })` with the user's JWT (RLS + auth respected; service role only for processor internals).

**Base URL pattern (auto via client):** `https://<project-ref>.supabase.co/functions/v1/<function-name>`

**Auth:** Most functions require Authorization: Bearer <user_jwt> (anon key + JWT). `notification-processor` is cron-only (service_role key, never exposed to client).

**Idempotency (ARCH CRITICAL-2 + BACKEND):** Every enqueued notification carries a stable `idempotency_key` (e.g. `match:uuid:push`). Processor skips already-`sent` rows. Match creation uses DB UNIQUE + ON CONFLICT DO NOTHING (23505 ignored in RPC).

---

## 2. Function: match-notify (or create_match RPC wrapper)

**Trigger:** Called from mobile after candidate right-swipe (or directly via RPC for employer-initiated match per 02-mvp / BACKEND decisions).

**Contract (TS / OpenAPI-style):**

```ts
// packages/shared/src/contracts/edge.ts (recommended location)
export interface MatchNotifyRequest {
  job_id: string;           // uuid
  candidate_id: string;     // uuid (auth.uid())
  // employer_id inferred server-side from job
}

export interface MatchNotifyResponse {
  match_id: string;         // uuid or null if duplicate (idempotent)
  status: 'created' | 'duplicate' | 'error';
  idempotency_key: string;  // e.g. "match:<match_id>:interest"
}

export type MatchNotifyError =
  | { code: 409; message: 'Duplicate swipe/match (idempotent)' }
  | { code: 403; message: 'RLS / role violation' }
  | { code: 404; message: 'Job not active or not visible' }
  | { code: 429; message: 'Rate limit exceeded (per-candidate or per-job)' };
```

**Example RN client call (DRY: see new EXPO_ + SUPABASE_ stack docs for init):**
```ts
import { supabase } from '../lib/supabase';

const { data, error } = await supabase.functions.invoke<MatchNotifyResponse>(
  'match-notify',
  {
    body: { job_id: 'uuid-of-job', candidate_id: user.id },
    headers: { 'X-Client-Version': '0.1.0' }
  }
);

if (error) {
  if (error.context?.status === 409) {
    // duplicate — treat as success (idempotent UI)
    return;
  }
  throw new EdgeFunctionError(error);
}
```

**Server-side (Edge) responsibilities (per BACKEND + ARCH):**
1. Validate JWT + RLS (candidate can swipe this job).
2. Call (or inline) `create_match` RPC (atomic INSERT ... ON CONFLICT (job_id, candidate_id) DO NOTHING; returns match or null).
3. If new match created: enqueue `interest_received` (to employer) and `match_created` (to both) into `notification_queue` with stable idempotency_keys.
4. Return match_id + status.

**Rate limits (MVP):** 10 swipes/min per candidate (Edge or DB trigger); 100 jobs/day per employer. Return 429 with `Retry-After`.

---

## 3. Function: notification-processor

**Trigger:** Cron (every 1 min, Supabase dashboard scheduler) + manual invoke (ops only). Never client-called.

**Input (for manual):** `{ queue_id?: string }` or empty (batch mode).

**Contract / Output:**
```ts
export interface ProcessorResponse {
  processed: number;
  failed: number;
  details?: Array<{ queue_id: string; action: string; error?: string }>;
}
```

**Logic (verbatim from BACKEND § Edge Functions 2026-05-27, adapted for contract):**
1. `SELECT * FROM pgmq_public.read('notification_queue', 5, 30)` (or direct table query with `status='pending' AND attempts < 3` ORDER BY created_at; limit 50 per ARCH/BACKEND).
2. For each row, switch on `payload.type` (or top-level type):
   - `interest_received`: "Someone's interested in [job title]" → employer push.
   - `match_created`: Push to candidate + employer + Realtime broadcast on `inbox:{profile_id}`.
   - `message_received`: Push with preview.
   - `hire_confirmed`: Both parties.
3. Lookup `device_tokens` for recipient(s) (RLS: own tokens only; service bypass for processor).
4. `POST https://exp.host/--/api/v2/push/send` (or expo-server-sdk if added) with:
   - `to: expoPushToken`
   - `title`, `body`
   - `data: { url: 'hi-hired://match/xxx', match_id, ... }` (for useNotificationObserver deep link per MCP 2026-05-28 expo_dev 86.3).
   - Android: `channelId: 'default' | 'high'` (MAX importance for matches).
5. On success: `UPDATE notification_queue SET status='sent', sent_at=now()`.
6. On failure: `attempts += 1`; if attempts >= 3 → DLQ or dead.
7. If `email_fallback` and push not opened in 2h → enqueue `email:*` (same processor, Resend fetch).

**Idempotency:** Skip any row where `status='sent'` or `idempotency_key` already processed in this run. Unique constraint on `notification_queue(idempotency_key)`.

**Example Edge TS skeleton (Deno):**
```ts
// supabase/functions/notification-processor/index.ts
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  // ... read queue, switch, fetch device_tokens, POST to exp.host, update status ...
  return new Response(JSON.stringify({ processed, failed }));
});
```

**Resend fallback (email):** Same processor; `POST https://api.resend.com/emails` with `from: notifications@hi-hired.com.au`, subject/body from payload.

---

## 4. Function: auth hooks (profile creation on signup)

**Trigger:** Supabase Auth hook (Database → Auth → Hooks → After user created) or Edge `auth-hook` (if using custom).

**Contract:**
- Input: Supabase Auth payload `{ user: { id, email, user_metadata: { role: 'candidate'|'employer', ... } } }`
- Output: `{ profile_id: uuid }` or error.

**Logic (per BACKEND § Database Functions "Auto-create profile on signup"):**
- INSERT into `profiles` (id = user.id, role from metadata, consent flags minimal per PRIVACY doc).
- If employer: also create stub `employer_profiles`.
- Return or ignore (trigger style).

**RN client impact:** After `signUp` / magic link / OAuth callback, profile exists automatically. No extra call needed (see new EXPO_ stack doc for callback router.replace + profile fetch).

---

## 5. Realtime Channels (Contract)

Naming: `{scope}:{entity_id}` (BACKEND § Realtime Channels).

- `match:{match_id}`: `postgres_changes` on `messages` INSERT (for both participants).
- `inbox:{profile_id}`: `postgres_changes` on `matches` (candidate or employer).
- `employer:{employer_id}:jobs`: `postgres_changes` on `swipes` (new interest).

Client subscribe (RN):
```ts
const channel = supabase.channel(`inbox:${user.id}`)
  .on('postgres_changes', { event: '*', schema: 'public', table: 'matches', filter: `candidate_id=eq.${user.id}` }, payload => { /* update Zustand / TanStack */ })
  .subscribe();
```

**Broadcast** (optional, future): server-side `supabase.channel(...).send({ type: 'broadcast', event: 'match_created', payload })`.

---

## 6. Error Codes, Rate Limits, Testing

| Code | Meaning | Client Handling |
|------|---------|-----------------|
| 200/201 | Success | Use data |
| 409 | Idempotent duplicate (swipe/match) | UI: "Already applied" — treat as success |
| 403 | RLS / auth | Redirect to login or role gate |
| 404 | Resource not visible/active | Refresh deck / show "job expired" |
| 429 | Rate limit | Backoff + "Too many swipes — try again in X min" |
| 500 | Edge internal (queue/processor) | Log to Sentry; fallback to in-app banner; retry later |

**Local testing (STACK + plan):**
```bash
supabase start
supabase functions serve notification-processor --env-file .env.local
# In another terminal: supabase functions invoke ... (with service key for processor)
# Or curl localhost:54321/functions/v1/match-notify -H "Authorization: Bearer <test-jwt>"
```

**Integration:** Vitest + Supabase local (per STACK Testing Stack) + Maestro E2E for full swipe→notif deep link.

**Rate limits (MVP, enforce in Edge or DB):** 10 swipes / min / candidate; 5 matches / day / employer. Return 429 with `Retry-After: 60`.

---

## 7. Cross-References & Maintenance

- **Full implementation logic:** `docs/BACKEND.md` § Edge Functions, § Match Logic Flow, § Database Functions & Triggers, § RLS Policy Matrix, `notification_queue` table.
- **ARCH fixes:** CRITICAL-1/2 (unique + queue).
- **Client patterns:** `docs/stack/EXPO_ROUTER_AUTH_NOTIFS_HAPTICS_2026.md` (token reg + observer), `SUPABASE_RLS..._2026.md` (RLS implications), `EXPO_NOTIFICATIONS_EDGE_PROCESSOR_2026.md`.
- **UX / legal:** `02-mvp-definition.md` (push in MVP), new `AU_FAIR_WORK...`, `PRIVACY_ACT...`, `GUARDRAILS.md`.
- **Ops:** `docs/ops/MIGRATION_RUNBOOK_FROM_BACKEND.md` (deploy after migrations), `EAS_BUILD_DEPLOY_CHECKLIST.md`.
- **Plan:** `docs/plans/2026-05-27-001` §R11 / U2.

**Update cadence:** Re-audit on Supabase SDK / Expo SDK major, or post-v1. Update this contract + BACKEND in lockstep. Manifest row 31 → full.

**When in doubt:** BACKEND wins for behavior; this file for the *surface* a mobile dev or new Edge author consumes.

---

*End of contracts. 2026-05-28 swarm. Ready for RN integration + Edge author. Test manually before U1 smoke (per migration runbook note).*