---
name: Documentation update
about: Request or propose an update to Hi-Hired docs (gap, stack, legal, indexes, AGENTS, hygiene, etc.)
labels: documentation
---

**Which docs are affected?**
- [ ] gap-analysis-2026-05-28.md or required-docs-manifest.md
- [ ] docs/stack/* (EXPO_, SUPABASE_, TANSTACK_, NOTIFS_EDGE_ 2026)
- [ ] docs/legal/* (AU_FAIR_WORK, PRIVACY, ANTI_DISCRIM, ASURIA)
- [ ] docs/ops/* (MIGRATION_RUNBOOK, EAS, INCIDENT, RETENTION)
- [ ] docs/api/* (EDGE_FUNCTIONS_CONTRACTS, AUTH_FLOWS_EXPO)
- [ ] Root hygiene (AGENTS.md, CONTRIBUTING.md, SECURITY.md, CODE_OF_CONDUCT.md, CHANGELOG.md, LICENSE)
- [ ] .github/ templates (this or PR)
- [ ] Indexes (root README, docs/README, foundational-docs/README)
- [ ] Other: [e.g. GUARDRAILS.md, TESTING_STRATEGY.md, STACK.md, BACKEND.md]

**Describe the update needed**
(Include exact section + why. For new research: cite MCP/browser with 2026-05-28 dates/paths.)

**Proposed changes (or attach diff)**
- [ ] Add / update outline in gap §6
- [ ] Update manifest status + owner
- [ ] Add 2026 facts (verbatim from Context7 /websites/expo_dev 86.3 or supabase 82.6 or fairwork browser snapshot 511 refs/117 interactive)
- [ ] Cross-link updates (DRY: reference canonicals, do not duplicate)
- [ ] Index pointers refreshed ("Full docs complete 2026-05-28" or re-audit note)

**2026 Research / Sources (MANDATORY — no invention)**
- Context7 MCP (expo_dev / supabase): 
- cursor-ide-browser (fairwork.gov.au/ 2026-05-27): 
- Local tools (Glob/Read/Grep/Shell 2026-05-28): 
- ARCHITECTURE_AUDIT.md / other canonicals: 
- Other (OAIC, legislation, ABS/Seek for intel): 

**Compliance / a11y / RLS impact?**
(Especially for legal/stack/ops changes affecting pay transparency, jobseeker PII/swipes/matches consent, DDA, Edge/RLS.)

**agent_logs row inserted?** (for agent/specialist work; include ID or "N/A human")

**Checklist (enforced in review)**
- [ ] Read gap §4 (Structure B) + §5 (tiers) + §8 (citations) + relevant outline
- [ ] DRY (reference STACK/BACKEND/02-mvp/ARCH/gap; no dupe of schema/flows)
- [ ] All new facts cited with exact 2026 dates/paths/tool
- [ ] For agent: logged before this issue (per AGENTS.md gate + CLAUDE.md)
- [ ] Will pass PULL_REQUEST_TEMPLATE (docs? a11y? RLS? sources? logs?)

---

**Hi-Hired 2026-05-28:** Doc updates are first-class (MUST before scaffold per manifest rows 41-43 + gap). All changes maintain Structure B (root hygiene/AGENTS; docs/ layered depth; foundational/ history), consistent voice (tables, banners, authority notes, "zero blockers"), and 2026 freshness. See dispatch DOC-012, design spec §1 (hygiene + AGENTS requirements), gap §6/7/9.

*Full hygiene + AGENTS + indexes 2026-05-28 complete via swarm (orchestrator + sam) DOC-012 + design/gap.*