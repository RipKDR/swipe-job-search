# Pull Request

**Hi-Hired 2026-05-28 Full Pre-Scaffold State:** All OSS hygiene (.github/ templates, LICENSE, CONTRIBUTING, SECURITY, CODE_OF_CONDUCT, CHANGELOG), AGENTS.md (swarm guide + logging gate), and indexes (root/docs/foundational README) complete via swarm (orchestrator + sam lanes) per dispatch DOC-007/011/012 + design spec 2026-05-28 §1 (Hygiene & OSS / Agent Foundations) + § "Swarm Execution Model" + gap-analysis-2026-05-28.md §3/5/6 Outline 7 + §7 + §9 + CLAUDE.md. Structure B implemented (root = hygiene + canonical pointers only; living depth in docs/{stack,legal,ops,api,research,...}; foundational-docs/ = immutable history). New dev/agent has zero blockers.

## Summary

(One paragraph: what + why. Cite relevant gap §6 outline / manifest row / design section / 2026 research.)

## Type

- [ ] docs (stack-deep 2026, legal 2026, ops runbook, API contracts, AGENTS/hygiene, indexes, manifest/gap update)
- [ ] research / intel (2026 competitor/market/validation; research-notes/ raw)
- [ ] code / impl (Expo RN/TS, Supabase client, Edge, monorepo — post-scaffold only)
- [ ] test / a11y / analytics (Maestro/RTL, @axe, PostHog/Sentry, coverage of new docs)
- [ ] ops / infra (EAS, CI, migrations, incident, retention)
- [ ] other (specify)

## 2026 Research Citations (MANDATORY — no invention; include exact dates/paths)

- Context7 MCP (/websites/expo_dev 86.3 or /supabase/supabase 82.6 2026-05-28): 
- cursor-ide-browser (fairwork.gov.au/ 2026-05-27 snapshot 511 refs/117 interactive or other): 
- Local tools (Glob/Read/Grep/Shell 2026-05-28 on 35 files): 
- ARCHITECTURE_AUDIT.md 2026-05-27 / other canonicals (STACK/BACKEND/02-mvp/AGENTS):
- Other (OAIC, legislation, ABS/Seek, etc.):

## Checklist (All Required — Enforced in Review; Agent Work Must Log First)

- [ ] **Docs updated?** (gap-analysis-2026-05-28.md §6 outlines or manifest status + "Implemented 2026-05-28 by <lane> via DOC-00X"; relevant stack/legal/ops/api; indexes if cross-cut; DRY references to canonicals)
- [ ] **a11y verified?** (WCAG 2.2 AA + AU DDA/DES for swipe hiring/jobseeker/employer flows; GUARDRAILS.md + new a11y/ACCESSIBILITY_AUDIT; haptics per MCP expo_dev 86.3)
- [ ] **RLS / Edge / security reviewed?** (docs/stack/SUPABASE..._2026.md + docs/api/EDGE... + BACKEND schema/RLS/Edge/notification_queue + ARCH CRITICAL fixes (match atomic 23505, queue processor, idempotency); SECURITY.md PII scope (jobseeker swipes/matches/profiles/work rights); no service_role bypass in client)
- [ ] **Sources cited with 2026 dates?** (Context7 expo_dev/supabase 2026-05-28 benchmark 86.3/82.6 + exact snippets; cursor-ide-browser fairwork 2026-05-27 snapshot + ref IDs e9/e10/e12/e52; gap §8; local 2026-05-28 tool timestamps; no training-data invention)
- [ ] **agent_logs row inserted?** (for any alex/jordan/dev/sam/maya/orchestrator work; per CLAUDE.md + AGENTS.md + dispatch gate; include row ID or "N/A (human only, no specialist lane)"; failed tasks still log with status "failed")
- [ ] **Tested / verified?** (per TESTING_STRATEGY.md + new stack docs; Vitest/RTL/Maestro for RN; RLS tests via anon/auth roles; Edge local + deployed smoke (swipe → match → notif); zero-blockers mental check for new dev/agent)
- [ ] **Compliance / legal signoff?** (for AU Fair Work/Privacy/DDA/Asuria/DES/App Store changes: alex lane + human noted; see docs/legal/ + gap §6 Outlines 3/4 + ARCH consent flag gap)
- [ ] **Structure B respected?** (no new root MDs except hygiene/AGENTS; depth in correct docs/ subdir; foundational-docs/ only pointer updates; DRY no sprawl)
- [ ] **Manifest / gap updated?** (status "full 2026-05-28 by <owner/lane> via swarm DOC-00X" for authored items; new rows if gaps found)

## Screenshots / Evidence (UI changes, docs renders, test runs, Supabase logs)

(Attach or link. For agent work: include agent_logs query result or Supabase dashboard screenshot showing row.)

## Related Issues / Cards / Dispatch

- Fixes # 
- Per dispatch DOC-2026-05-28-XXX (paste link or card title)
- Design spec 2026-05-28 §X
- gap-analysis-2026-05-28.md §6 Outline X

## Post-Merge (Orchestrator / Human)

- [ ] Verify agent_logs row(s) in Supabase (orchestrator gate)
- [ ] Update required-docs-manifest.md + gap §6 "Implemented" appends
- [ ] Refresh indexes if needed ("Full docs complete 2026-05-28" pointers)
- [ ] Human legal/compliance signoff (if AU/PII/a11y)
- [ ] Discord #planning + lane channel record copy
- [ ] Close related issues/cards

---

**Hi-Hired 2026-05-28 (Structure B + Agent DNA):** This template enforces the project's auditability, 2026 freshness, Australian compliance (Fair Work pay transparency on every card, Privacy Act consent for jobseeker PII/swipes/matches per ARCH CRITICAL, DDA a11y), and agent-orchestrated process (mandatory logging gate before any final, per CLAUDE.md + AGENTS.md + dispatch package). All PRs (human or agent) must pass these checks. New contributor: read AGENTS.md + CONTRIBUTING.md + gap + manifest + this template = knows exact standards.

*Full hygiene + AGENTS + indexes complete 2026-05-28 via swarm (orchestrator + sam) DOC-012 + design spec §1 + gap §3/5/7. DRY, cited, consistent voice. Zero blockers for pre-scaffold "Next Step" follower.*