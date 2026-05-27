# Security Policy

## Supported Versions

Hi-Hired is pre-scaffold (2026-05-28 full docs state). No production releases yet. Security issues in planning/docs are treated with the same rigor as code (agent logs + human review).

| Version | Supported          |
| ------- | ------------------ |
| Pre-0.1 (docs + planning) | ✅ Full (MUST hygiene + legal + stack-deep complete 2026-05-28) |
| Future v0.1+ (post scaffold/MVP) | ✅ (will follow semver + security updates) |

## Reporting a Vulnerability

**Report privately.** Do not open public issues for security matters.

- **Preferred:** GitHub Security Advisory (private) on this repo
- **Email:** security@hi-hired.example (or via OpenClaw orchestrator Telegram/Discord for agent-reported)
- **Agent path:** If an agent (jordan/sam) discovers a PII/RLS/Edge/auth exposure during docs authoring or review, log to agent_logs first (per gate), then report via private channel + reference the log row.

**Include (as much as possible, without exploiting):**
- Description of the issue and potential impact (e.g. "jobseeker swipe PII exposed via missing RLS on swipes table allowing anon select")
- Affected component (specific Edge Function, RLS policy, storage bucket, Expo deep link, profile consent flow, etc.)
- Reproduction steps or citation to relevant doc (e.g. "see docs/stack/SUPABASE_RLS..._2026.md §2 and BACKEND.md ERD")
- 2026 research context (MCP citations if relevant)
- Suggested fix or mitigation (if known)
- Your contact (for follow-up; agents: include agent_logs row ID)

**Response SLA (pre-launch):** Acknowledgement within 48h; triage + plan within 5 business days. Public disclosure coordinated after fix (responsible disclosure).

## Scope & Critical Assets (Hi-Hired Specific, 2026-05-28)

This is a **jobseeker PII-heavy** platform (swipes, matches, profiles with experience/skills/availability/work rights/avatars/suburb, hire confirmations, reports/blocks). Australian compliance (Privacy Act 1988 APPs, Notifiable Data Breaches scheme, Fair Work pay transparency, DDA) makes certain classes high-risk.

**High-sensitivity (treat as critical):**
- Jobseeker swipes/matches (reveals intent, availability, work rights → potential adverse action/discrimination risk)
- Profiles (bulk_swipe_consent flag gap per ARCHITECTURE_AUDIT.md 2026-05-27 CRITICAL; absence = Privacy Act violation at launch for provider bulk consent)
- device_tokens + notification_queue (Expo push + PII routing)
- Auth (PKCE deep links "hi-hired://", SecureStore, role-based (candidate/employer))
- Edge Functions (match-notify atomic insert + 23505 handling per ARCH CRITICAL1; notification-processor with queue + idempotency per ARCH CRITICAL2)
- Storage (avatars/jobs-photos buckets + policies)
- Realtime (messages/matches channels with RLS on realtime.messages per MCP 2026-05-28)

**Lower (but still protected):** Employer postings (pay_display structured per BACKEND/02-mvp + new AU_FAIR_WORK legal), public job search (no PII).

**2026 Research Citations (mandatory for any security doc/PR):**
- Context7 MCP /supabase/supabase 82.6 2026-05-28 (RLS multi-tenant patterns for profiles/jobs/swipes/matches/messages; pgmq queue Edge; storage policies public-read + owner-insert; realtime.messages RLS)
- ARCHITECTURE_AUDIT.md 2026-05-27 (Match TOCTOU race → UNIQUE + atomic + 23505 ignore; notif fire-and-forget → notification_queue + processor + idempotency; bulk_swipe_consent missing = Privacy violation)
- cursor-ide-browser fairwork.gov.au/ 2026-05-27 snapshot (511 refs/117 interactive; pay transparency emphasis for beachhead)
- gap-analysis-2026-05-28.md §1/2/6 (PII in legal outlines; RLS/Edge in stack outlines)
- design spec 2026-05-28 §1 (SECURITY.md requirements), §3 (legal), §4 (ops incident/retention)

See `docs/legal/PRIVACY_ACT_RECRUITMENT_JOBSEEKER_DATA_2026.md`, `docs/ops/DATA_RETENTION_PURGE_PLAN.md` (when authored), `docs/stack/SUPABASE_RLS..._2026.md`, `docs/api/EDGE_FUNCTIONS_CONTRACTS.md`, BACKEND.md (full schema + RLS hints + Edge specs), GUARDRAILS.md §7 (AU Privacy).

## Security in Contributions (Enforced via PR Template + AGENTS.md)

All PRs/changes (especially RLS, Edge, auth, storage, PII-handling docs/code) **must**:
- Cite 2026 sources with dates/paths (see above)
- Update or reference relevant security/legal/ops docs
- Include "RLS / Edge / security reviewed?" checkbox (PULL_REQUEST_TEMPLATE)
- For agent work: agent_logs row inserted before final (status completed/failed)
- For legal/PII changes: human compliance signoff noted

**Pre-scaffold (2026-05-28 full state):** All hygiene (.github templates with security/RLS/PII checklists), AGENTS.md (gate + lanes), SECURITY.md, CONTRIBUTING.md (gate + checklist), CODE_OF_CONDUCT (DDA/PII), LICENSE (AU note), CHANGELOG (audit entries), and indexes updated. Structure B: root = hygiene only; depth in docs/security/ (future), docs/legal/, docs/ops/, docs/stack/.

**Known pre-code gaps (from ARCH 2026-05-27, addressed in docs):** Missing bulk consent flag; notif reliability (queue + processor); match race (atomic + 23505). These are documented in ARCHITECTURE_AUDIT.md + BACKEND + new stack/API/ops docs. Do not re-introduce in contributions.

## Vulnerability Disclosure History

None (pre-launch 2026-05-28).

---

**Full Hygiene + AGENTS + Indexes Complete 2026-05-28:** Per swarm coordinator + sam (orchestrator lanes) execution of dispatch DOC-011/012 + DOC-007 (AGENTS) + design spec §1 (Hygiene & OSS / Agent Foundations + SECURITY requirements) + gap-analysis-2026-05-28.md §3/5/6 (outlines + PII classification) + §7 (swarm plan) + §8 (citations) + §9 (artifacts + index updates). All per CLAUDE.md mandatory gate + OpenClaw specialist model. DRY (reference gap/design/dispatch; no invention). New contributor/agent: read this + AGENTS + gap + manifest + 1 legal + 1 stack-deep = zero blockers + knows exact reporting path. See root/docs/foundational README "2026-05-28 Pre-build / Full docs" sections for navigation.

*Maintained via required-docs-manifest.md row 4 + gap re-audit triggers (quarterly or on major SDK/Fair Work/Privacy change). Human legal signoff required on any PII/RLS/auth/legal security doc.*