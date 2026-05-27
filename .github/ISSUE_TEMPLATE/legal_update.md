---
name: Legal / Compliance update
about: Propose or report update to AU Fair Work, Privacy Act, DDA, Asuria/DES, App Store, or related compliance docs (critical for beachhead launch)
labels: legal, compliance
---

**Which legal area?**
- [ ] AU Fair Work pay transparency / casual rules 2026 (browser snapshot pay/wages/calculator/guides/award finder; hospitality/retail beachhead)
- [ ] Privacy Act 1988 (Cth) — jobseeker PII, swipes/matches, bulk consent flag (ARCH CRITICAL gap), notifiable breaches, retention/purge, APPs for recruitment platforms
- [ ] Disability Discrimination Act 1992 (Cth) / a11y (WCAG 2.2 AA + DDA for swipe hiring UX, DES/Asuria accommodations)
- [ ] Adverse action / sham casual / Fair Work Act 2009 (employer posting, platform liability)
- [ ] Asuria / DES / visa / work rights hooks (reporting, consent, display in cards/profiles)
- [ ] App Store requirements (privacy, data handling, push notifs)
- [ ] Other (cross-border, data export, etc.)

**Describe the update / gap / new requirement**
(Include exact 2026 source + implications for UI (every card pay_display + hours + suburb per 02-mvp/BACKEND), onboarding (<60s consent per 02-mvp), employer form validation, audit logs, RLS/storage policies, Edge functions, profiles table (bulk_swipe_consent flag per ARCH 2026-05-27).)

**2026 Research Citations (MANDATORY — verbatim with dates/paths)**
- cursor-ide-browser fairwork.gov.au/ 2026-05-27 snapshot: (511 refs/117 interactive; "Pay and wages" e9, "Pay Calculator" e10, "Pay guides" e12, "Find my award" e52, sectors fast food e21/hospitality e30/small business e30/visa e31; 404 on legacy /pay contracts URL)
- Context7 /supabase/supabase 82.6 2026-05-28 (RLS/storage/realtime patterns for PII tables)
- ARCHITECTURE_AUDIT.md 2026-05-27 (Task 7 bulk_swipe_consent missing = Privacy Act violation at launch)
- OAIC / legislation.gov.au / fairwork.gov.au (exact amendments or guidance 2026)
- gap-analysis-2026-05-28.md §6 Outline 3/4 + §8 + docs/legal/ (AU_FAIR_WORK... / PRIVACY... when full)

**Impact on existing docs / code (Structure B)**
- [ ] Update docs/legal/AU_FAIR_WORK_PAY_TRANSPARENCY_CASUAL_2026.md or PRIVACY_...
- [ ] Pointer / archive note in foundational-docs/04-legal-data-sources.md
- [ ] RLS / storage / Edge changes (docs/stack/SUPABASE... + docs/api/EDGE... + BACKEND)
- [ ] UI/UX (GUARDRAILS.md, 02-mvp, APP_FLOW, RECRUITER_FLOW)
- [ ] Ops (DATA_RETENTION_PURGE_PLAN, INCIDENT_RESPONSE)
- [ ] Profiles schema / onboarding consent (BACKEND + new stack/auth docs)
- [ ] Manifest / gap §6 "Implemented" append + indexes

**agent_logs row?** (mandatory for agent work; ID or "N/A human + legal signoff pending")

**Human compliance / legal signoff**
- [ ] Reviewed by alex (research/legal lane) + external counsel if high-risk
- [ ] Signoff recorded in this issue or PR (name + date)

**Checklist (enforced)**
- [ ] Read gap §5 (MUST legal) + §6 Outlines 3/4 + design §3 (Legal & Compliance 2026)
- [ ] All facts cited with 2026-05-27/28 timestamps/paths (no invention; browser snapshot first)
- [ ] DRY (reference 02-mvp/BACKEND/ARCH/GUARDRAILS; do not dupe schema or general advice)
- [ ] For agent: logged before this issue (AGENTS.md + CLAUDE.md gate)
- [ ] Will pass PULL_REQUEST_TEMPLATE (docs? a11y? RLS? sources cited 2026? logs? legal signoff?)

---

**Hi-Hired 2026-05-28 (Critical for beachhead):** Legal/compliance issues block scaffold + launch. Pay transparency (every card specific rate/hours/suburb per Fair Work 2026) + Privacy consent flag (profiles.bulk_swipe_consent for bulk swipes/PII) are MUST pre-code per ARCH + gap + design. All updates require human signoff. See SECURITY.md (PII scope + breach), docs/legal/ (full when authored), AGENTS.md (alex lane + gate), dispatch DOC-003/004/012.

*Full hygiene + AGENTS + indexes 2026-05-28 complete via swarm (orchestrator + sam) DOC-012 + design/gap §1/3/5/6/7.*