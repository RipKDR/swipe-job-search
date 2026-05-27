# Incident Response: Matches & Notifications 2026

> **Status:** FULL 2026-05-28 by sam (qa lane) via Hi-Hired swarm SHOULD batch. Per design spec SHOULD list + gap-analysis-2026-05-28.md §5 (Ops SHOULD) + §7 (sam owner for incident) + §8 (ARCH CRITICAL 2026-05-27 + MCP 2026-05-28). Builds on docs/ops/MIGRATION_RUNBOOK_FROM_BACKEND.md, docs/stack/EXPO_ROUTER_AUTH_NOTIFS_HAPTICS_2026.md, docs/api/EDGE_FUNCTIONS_CONTRACTS.md, BACKEND.md (notification_queue), ARCHITECTURE_AUDIT.md (CRITICAL2 fire-and-forget fix).

## Rationale
Matches and notifications are the core "magic" of Hi-Hired (employer posts → candidate swipe right → reciprocal → instant match + push + realtime). Per ARCHITECTURE_AUDIT 2026-05-27 CRITICAL, the original fire-and-forget (no queue, no retry, no idempotency) guarantees dropped matches/notifs at scale or on cold Edge starts. This runbook gives sam + on-call the exact playbooks to detect, triage, mitigate, and prevent recurrence before beachhead launch (hospitality/retail Melbourne northern suburbs). Unblocks reliable U1-U3 flows per 02-mvp and docs/plans/2026-05-27-001.

## 2026 Facts & Sources (Verbatim Citations)
- ARCHITECTURE_AUDIT.md 2026-05-27: "CRITICAL2: notification fire-and-forget (add notification_queue + processor + idempotency)"; "Task 7 ... bulk_swipe_consent ... Missing = Privacy Act violation"; match TOCTOU (UNIQUE + atomic 23505 ignore).
- Context7 MCP /websites/expo_dev benchmark 86.3 2026-05-28 (v55/56): physical device only for push (simulator no); EAS projectId required in Constants.expoConfig.extra; useNotificationObserver hook for deep links; haptics on match success.
- Context7 MCP /supabase/supabase 82.6 2026-05-28: pgmq queue Edge processor (read/delete RPC, Deno.serve loop); realtime.messages RLS; Edge cold starts require queue.
- Local 2026-05-28 (gap §8 Shell/Glob): BACKEND has notification_queue + Edge processor spec; 3 Supabase projects (dev/staging/prod); EAS for builds; no firecrawl/parallel in PATH.
- cursor-ide-browser fairwork.gov.au/ 2026-05-27 snapshot (511 refs/117 interactive): Pay Calculator etc for beachhead; privacy links e61.
- All per gap §8 "Sources, Citations, Tool Usage (Exhaustive, Verifiable)" 2026-05-28: no invention; MCP schemas read first; citations with tool paths/dates.

## Incident Classification & Severity
| Severity | Examples (Matches/Notifs) | Response Time | Escalation |
|----------|---------------------------|---------------|------------|
| P0 Critical | Match created but no push to either party; queue backpressure >100 msgs; Expo token invalid for >10% users; cold start drops all notifs | <15min | sam on-call + jordan (arch) + Discord #incidents |
| P1 High | Partial delivery (one side gets notif); duplicate notifs (idempotency fail); realtime works but push delayed >5min | <1h | sam + dev |
| P2 Medium | Haptics missing on match (UX); single user token refresh fail; low-volume retry storm | <4h | sam |
| P3 Low | Analytics event missing for match; log noise | Next sprint | - |

## Detection & Monitoring (2026 Stack)
- **Supabase + PostHog (new docs/analytics/POSTHOG...)**: Alert on `match_created` event count drop >20% vs 7d avg or `match_notification_seen` lag.
- **Sentry RN (new docs/analytics/SENTRY...)**: Performance transaction "swipe-to-match" p95 >10s; error "Expo push failed".
- **Edge logs / Supabase Edge Function logs**: Watch notification-processor for "pgmq read 0 after 5 retries", "Expo 400 token invalid".
- **Queue depth**: Custom metric or Supabase query on notification_queue (unprocessed >50 = P0).
- **Physical device canary**: Weekly manual smoke on iOS/Android dev client (per EAS checklist + EXPO_ doc).

## Runbooks (Step-by-Step)

### P0: No Match Notification Delivered
1. Confirm match row exists (Supabase dashboard or `select * from matches where id = ?`).
2. Check notification_queue for corresponding entry (or processor logs for the match_id).
3. If queue has it but not processed: trigger manual Edge invoke (or restart processor if cron/Edge function).
4. If processor ran but Expo returned error: inspect device_tokens for user (expired/ invalid). Force refresh path in client (per EXPO_ observer + SecureStore).
5. If token valid but still fail: fallback Resend email (per EDGE_CONTRACTS) + log to incident.
6. Idempotency check: search logs for duplicate attempts (use key = match_id + channel).
7. Post-mortem: add to queue processor retry (exponential backoff + DLQ after 5); update ARCH CRITICAL notes.
8. Notify users via in-app (realtime broadcast) + "We sent your match via email as backup".

### P1: Duplicate or Delayed Notifs
- Root: missing UNIQUE on (match_id, channel) or processor restart without lease.
- Fix: re-deploy Edge with idempotency key (e.g. `X-Idempotency-Key: match-${id}`); client dedupe on received listener.
- Verify with Maestro E2E (new TESTING_STRATEGY RN section): swipe right → wait 3s → assert single notif + haptics.

### Cold Start / Edge Processor
- Per gap §8 + SUPABASE stack doc (MCP 82.6): "cold Edge starts (use queue per ARCH)".
- Mitigation: always queue first (even for "immediate" match-notify Edge); processor runs every 30s or on trigger; keep-alive ping low-volume.
- Test: force Edge cold (no traffic 10min) → create match → assert delivery <30s.

## On-Call & Communication
- Primary: sam (Discord 1503121038265946152 or OpenClaw alert).
- Backup: jordan / dev.
- Channel: #incidents (private) + Telegram orchestrator for P0.
- Post-incident: update this doc + gap §6 append + manifest; run "zero blockers" re-test on affected flow.

## Rollback & Recovery
- Edge: `supabase functions deploy notification-processor --project-ref <prod> --no-verify-jwt` (previous git tag).
- DB: if bad migration, use numbered rollback in MIGRATION_RUNBOOK.
- Client: EAS update rollback (or App Store phased release pause).
- Data: if duplicate matches, use the 23505 ignore + manual dedupe script (Privacy-safe, log only).

## Prevention (Ties to New Docs)
- Implement per EDGE_FUNCTIONS_CONTRACTS + EXPO_ 2026 (idempotency, queue, physical device test matrix in EAS checklist).
- Add to CI: post-deploy smoke (employer post → candidate swipe → match → notif seen in PostHog + physical canary).
- Quarterly: re-run gap §8 research (MCP re-query expo_dev/supabase on SDK change).
- a11y: ensure incident banners/announcements are WCAG compliant (cross docs/a11y/ACCESSIBILITY_AUDIT_CHECKLIST.md + GUARDRAILS update).

## References (DRY — Read These First)
- gap-analysis-2026-05-28.md §5 (SHOULD ops), §7 (sam incident owner), §8 (all 2026-05-28 MCP/browser/ARCH citations, tool usage rules).
- docs/ops/MIGRATION_RUNBOOK_FROM_BACKEND.md (queue in migrations).
- docs/stack/EXPO_..._2026.md (notif reg, observer, haptics, gotchas 2026).
- docs/api/EDGE_FUNCTIONS_CONTRACTS.md (processor contract, idempotency).
- BACKEND.md (notification_queue schema, Edge specs, ARCH fixes incorporated).
- ARCHITECTURE_AUDIT.md 2026-05-27 CRITICAL2.
- New: docs/analytics/POSTHOG... + SENTRY... (alerting), docs/a11y/... (inclusive incident UX), TESTING_STRATEGY.md (Maestro smoke), GUARDRAILS.md (haptics/privacy 2026 update).
- STACK.md (EAS/deploy 2026-05-27, env matrix, PostHog/Sentry).
- 02-mvp (push in MVP, match core promise).
- CLAUDE.md + dispatch package (sam lane, mandatory agent_logs gate — this task logged before summary).

**New dev/on-call test (zero blockers):** After reading only this + gap §5/8 + 3 cross files above + STACK EAS, can triage a dropped match notif on physical device + queue processor in <20min with no external search.

*Implemented 2026-05-28 sam/maya swarm per design spec + gap §4 Structure B (ops/ subdir). All facts cited; no invention; DRY enforced.*