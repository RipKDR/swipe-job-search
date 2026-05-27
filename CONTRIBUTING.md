# Contributing to Hi-Hired

Thank you for helping build the future of transparent, human-first local job matching in Australia. This project is **agent-orchestrated** (OpenClaw specialists + ruflo/claude-flow parallel swarms) and **compliance-heavy** (Fair Work pay transparency, Privacy Act for jobseeker PII/swipes/matches, DDA/Asuria/DES hooks, App Store requirements).

## Project DNA (2026-05-28)

- Mobile-first Expo RN TS monorepo + Supabase (Sydney ap-southeast-2)
- Beachhead: Melbourne northern suburbs (Tullamarine etc) — hospitality/retail casual roles
- Core principles: transparent pay on every card, bilateral opt-in (candidate swipe → employer chat), no keyword search/resumes in v1, free for seekers
- Agent scale: All specialist work (research, arch, impl, qa) routes through documented lanes with mandatory Supabase logging (see below)
- Pre-scaffold docs complete: Structure B (root hygiene + canonical pointers only; living depth in `docs/{stack,legal,ops,api,research,...}`; foundational-docs/ immutable history). See [docs/research/gap-analysis-2026-05-28.md](docs/research/gap-analysis-2026-05-28.md) and [docs/research/required-docs-manifest.md](docs/research/required-docs-manifest.md)

**Full docs state:** Hygiene + AGENTS + indexes + key stack/legal/ops/api complete 2026-05-28 (see "Full docs complete 2026-05-28" banners in indexes). Zero blockers for new dev/agent before scaffold.

## How to Contribute (Human or Agent)

1. **Read the map first** (zero hunting):
   - [README.md](README.md) "Next Step" + Pre-build audit section
   - [docs/research/gap-analysis-2026-05-28.md](docs/research/gap-analysis-2026-05-28.md) (catalog, structure, tiers, outlines, swarm plan, 2026 MCP/browser citations)
   - [docs/research/required-docs-manifest.md](docs/research/required-docs-manifest.md) (living status table)
   - Canonicals: [STACK.md](STACK.md), [docs/BACKEND.md](docs/BACKEND.md), [foundational-docs/02-mvp-definition.md](foundational-docs/02-mvp-definition.md)
   - AGENTS.md (this swarm's operating manual)

2. **For agent/specialist work**: Use documented dispatch (see AGENTS.md). Never skip the logging gate.

3. **For code/docs PRs**: Follow the PR template checklist (enforced in .github/PULL_REQUEST_TEMPLATE.md). All changes must cite sources with 2026 dates (MCP/browser/gap §X) and update relevant docs.

## Specialist Lanes (OpenClaw / ruflo / Telegram)

See [CLAUDE.md](/home/admin/CLAUDE.md) (workspace rule) and [AGENTS.md](AGENTS.md) for full table. Quick reference (Discord channels for record copies):

| Agent | ID | Discord | Domain (Hi-Hired focus) |
|-------|----|---------|-------------------------|
| Alex 🔎 | `alex` | 1503111680945557614 | Product research, legal (Fair Work/Privacy), competitors, intel, Asuria/DES |
| Maya ✍️ | `maya` | 1503120930572996678 | UX/UI, flows, microcopy, a11y (WCAG + DDA), swipe polish |
| Jordan 📐 | `jordan` | 1503120974198083747 | Architecture, Supabase/RLS/Edge, APIs, stack-deep 2026 refs, security, AGENTS/ops |
| Dev 🛠️ | `dev` | 1503121011501957331 | Implementation, Expo RN/TS examples, monorepo, adapt existing, hygiene stubs, EAS |
| Sam 🚦 | `sam` | 1503121038265946152 | QA, testing (Maestro/RTL/Vitest), a11y audits, analytics (PostHog), incident runbooks, PR template enforcement, docs coverage |

**Routing shortcuts** (Telegram orchestrator): `/alex <task>`, `/jordan <task>`, etc.

**Dispatch example (OpenClaw):** `openclaw agent --agent jordan --message "Execute DOC-2026-05-28-001 per docs/research/swarm-dispatch-2026-05-28-full-docs.md. Cite Context7 expo_dev 86.3 2026-05-28. Log to agent_logs before final."`

**Parallel swarm (ruflo recommended):** See AGENTS.md + design spec § "Swarm Execution Model" + gap §7. Use `swarm-init` with anti-drift config + task graph for independent cards (e.g. legal alex parallel to stack jordan).

## Mandatory Supabase agent_logs Gate (Non-Negotiable)

**Every specialist agent (alex/maya/jordan/dev/sam) or swarm member MUST insert a row into `agent_logs` BEFORE sending any final reply, Discord post, Telegram summary, or "task done".** Failed tasks still log (`status: "failed"`).

**Exact curl (copy-paste; one retry max; surface blocker on persistent failure):**

```bash
curl -sS -X POST 'https://twwmqqgjtdbcvrkinifa.supabase.co/rest/v1/agent_logs' \
  -H 'apikey: sb_publishable_amzArN-PtOSPCQQVNtOVaw_geB8qjzL' \
  -H 'Authorization: Bearer sb_publishable_amzArN-PtOSPCQQVNtOVaw_geB8qjzL' \
  -H 'Content-Type: application/json' \
  -H 'Prefer: return=minimal' \
  --data '{"agent_name":"<alex|jordan|dev|sam|maya|orchestrator>","task_description":"<one-sentence summary of THIS task/card>","model_used":"<claude-4.5-opus|your-model-id>","status":"completed"}'
```

**Per this project (from dispatch package + CLAUDE.md):** Use lowercase agent_name matching lanes above. Task_description must reference the specific card/outlines (e.g. "Authored full prose for docs/stack/EXPO_... per gap §6 Outline 1 + dispatch DOC-001 + design §2; MCP expo_dev 86.3 2026-05-28 cited").

Orchestrator verifies logs in Supabase before synthesis/close. No log = task not accepted.

See AGENTS.md for full gate + examples; CONTRIBUTING for PR enforcement of "agent_logs inserted?" checkbox.

## PR Process & Checklist

All PRs (human or agent-authored) must:

- Target the correct tier (MUST before scaffold; see manifest)
- Update relevant docs (gap §6 outlines, manifest status, indexes if cross-cut)
- Cite 2026 sources inline with dates/paths (Context7 /websites/expo_dev 2026-05-28 benchmark 86.3; cursor-ide-browser fairwork.gov.au/ 2026-05-27 snapshot 511 refs/117 interactive; local Glob/Read/Grep 2026-05-28)
- Pass the project-specific checks in PULL_REQUEST_TEMPLATE.md (docs updated? a11y verified? RLS/Edge/security reviewed? sources cited? agent_logs row for specialist work? tested per TESTING_STRATEGY + new stack docs?)
- For legal/compliance changes: human signoff noted
- For agent work: log row ID included in PR description

See [.github/PULL_REQUEST_TEMPLATE.md](.github/PULL_REQUEST_TEMPLATE.md) (enforced) and design spec §1 for rationale.

## Local Setup Notes (Pre-Scaffold)

- Node 20.18+, npx expo ~56 (per 2026-05-28 env checks)
- Firecrawl/parallel/pnpm/supabase CLI: absent in base env (use authorized MCP equivalents: context7-plugin-context7, cursor-ide-browser, plugin-browse-browser per gap §8 + firecrawl skill rules)
- Supabase: 3 projects (dev/staging/prod) per STACK; use SUPABASE_ACCESS_TOKEN for CI
- Agent env: openclaw CLI + Discord access for lanes; ruflo/claude-flow skills in /root/.cursor/plugins/cache for swarms

See STACK.md §Env/Deploy, docs/ops/MIGRATION_RUNBOOK_FROM_BACKEND.md (once full), AGENTS.md.

## Code of Conduct

See [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) (Contributor Covenant v2.1 + explicit AU DDA/anti-discrimination for swipe hiring UX + beachhead inclusive hiring note).

## Questions / Overlaps (Agents)

Log "Question for coord: ..." to your lane + wait. Coordinator arbitrates (DRY: "put in X, ref from Y"). Never edit another agent's target file without handoff. See dispatch package "Overlap / Conflict Handling".

## License

MIT (see [LICENSE](LICENSE)). All contributions must respect Australian compliance (Privacy Act, Fair Work, DDA).

---

**2026-05-28 Full State:** All OSS hygiene + AGENTS.md + index updates complete per swarm (orchestrator + sam lanes) DOC-007/011/012 + design spec §1 (Hygiene & OSS / Agent Foundations) + § "Swarm Execution Model" + gap-analysis-2026-05-28.md §3/5/6 Outline 7 + §7 mini swarm plan + §9 artifacts + CLAUDE.md. Structure B implemented. DRY, cited, agent/human-friendly. New contributor/agent reads this + AGENTS + gap + manifest + 3-4 key files = zero blockers. See root README "Pre-build docs audit complete 2026-05-28" and docs/README for navigation.

*Maintained via required-docs-manifest.md + gap re-audit triggers. Human legal/compliance review on AU changes.*