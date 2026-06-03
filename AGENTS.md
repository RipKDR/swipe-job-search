# AGENTS.md — Hi-Hired Swarm / Agent Operations Guide

**2026-05-28 Full State:** This is the practical, one-stop "how we run swarms and specialist agents here" manual. Created as part of cross-cutting MUST hygiene (dispatch DOC-007 + design spec §1/7 + gap §6 Outline 7 + §7 mini swarm plan + CLAUDE.md). Complements [CONTRIBUTING.md](CONTRIBUTING.md) (agent routing + gate in PR context) and [docs/research/gap-analysis-2026-05-28.md](docs/research/gap-analysis-2026-05-28.md) (outlines + swarm plan + citations).

**2026-05-30 Update:** Added [Architect-Developer Protocol](#architect-developer-protocol-operating-protocol) — spec-driven development with 4-element blueprint, Technical Schema, complete implementation mandate, and 4-lens self-correction review. All AI-assisted engineering on this project follows this protocol.

---

**Project DNA:** Agent-orchestrated (OpenClaw specialists + ruflo/claude-flow parallel authoring + monitoring), Supabase-heavy (RLS/Edge/queues/auth per 2026 MCP), Australian compliance (Fair Work pay transparency 2026, Privacy Act for jobseeker PII/swipes/matches, DDA/Asuria/DES, App Store), pre-scaffold (Structure B docs complete 2026-05-28: root hygiene + AGENTS + indexes + layered docs/ depth; foundational-docs/ immutable history). All work (research, arch, impl, qa, legal) routes through documented lanes with **mandatory Supabase `agent_logs` gate** before any final reply.

**Zero blockers for new coordinator/agent:** Read this + CONTRIBUTING + gap §7 + design spec "Swarm Execution Model" + 1-2 dispatch cards = can dispatch parallel work, enforce gate/anti-drift, synthesize, and update indexes/manifest.

---

## Specialist Lanes (OpenClaw / ruflo / Telegram Orchestrator)

Exact mapping from [CLAUDE.md](/home/admin/CLAUDE.md) (workspace rule, source of truth for IDs/routing) + design spec § "Swarm Execution Model" + gap §7. Use these for all dispatches.

| Agent | ID (for `openclaw agent --agent`) | Discord Channel ID (record copies) | Primary Domain (Hi-Hired 2026 focus) | Secondary / Polish |
|-------|-----------------------------------|------------------------------------|--------------------------------------|--------------------|
| Alex 🔎 | `alex` | `1503111680945557614` | Product research, requirements, MVP scope, competitors, legal (AU Fair Work pay transparency/casual 2026 from browser snapshot, Privacy Act recruitment/jobseeker data, anti-discrim, Asuria/DES hooks), intel (Melbourne market signals, validation sources) | Update 04-legal pointer in foundational-docs/; manifest updates; 2026 research-notes/ raw pulls |
| Maya ✍️ | `maya` | `1503120930572996678` | UX/UI, flows, screens, microcopy, accessibility (WCAG 2.2 AA + AU DDA/DES for swipe hiring + jobseeker/employer apps) | GUARDRAILS.md RN polish (haptics from MCP expo_dev 86.3, @axe-core/react-native); UX cross-checks in stack/legal docs |
| Jordan 📐 | `jordan` | `1503120974198083747` | Architecture, database (Supabase Sydney RLS/Edge/queues/storage/realtime per MCP 82.6), auth, APIs (Edge contracts), security, stack-deep 2026 refs (Expo Router/auth/notifs/haptics, TanStack RN patterns), ops runbooks (migration, EAS, incident, retention), AGENTS.md / swarm guide | Hygiene templates review; BACKEND/ARCH cross-checks; API contracts + MIGRATION_RUNBOOK |
| Dev 🛠️ | `dev` | `1503121011501957331` | Implementation, code examples (Expo RN/TS, SecureStore, haptics, optimistic swipe), monorepo (apps/mobile + packages/shared), adapt existing (AUTH_FLOWS, NOTIFICATIONS, TESTING), hygiene stubs (LICENSE/CHANGELOG), EAS/build/deploy | RN examples in new stack-deep docs; EAS_CHECKLIST; client-side Edge calls per API_CONTRACTS |
| Sam 🚦 | `sam` | `1503121038265946152` | QA, release, analytics (PostHog taxonomy/impl for RN), monitoring/rollback, a11y audits (ACCESSIBILITY_AUDIT + GUARDRAILS update with MCP), incident response (matches/notifs per ARCH CRITICAL), PR template enforcement, test coverage of new docs, docs QA | RLS/Edge test notes in stack/API docs; incident runbooks; analytics impl; swarm synth verification (zero-blockers test) |
| Swarm Coord / Orchestrator | (ruflo/OpenClaw main or human) | — (cross-lane or Telegram) | Parallel dispatch + monitor-stream (ruflo), anti-drift enforcement, collection/synthesis, logging gate verification across agents, index/manifest/gap updates post-swarm, human handoff for legal signoff | This AGENTS.md + dispatch package maintenance; gap refresh orchestration |

**Routing shortcuts (Telegram main OpenClaw orchestrator session):** `/alex <task>`, `/maya <task>`, `/jordan <task>`, `/dev <task>`, `/sam <task>`.

**Standard pipeline (per CLAUDE.md):** Alex (research/legal) → Maya (UX polish) → Jordan (arch/backend/api) → Dev (impl/adapt) → Sam (QA/release) → Orchestrator synthesis + Discord record.

**Discord record copies:** All specialist outputs (start/complete after log) posted to lane channel. Coordinator uses `openclaw message read --channel discord --target channel:<id> --limit 5` or Supabase agent_logs query for monitoring.

---

## Mandatory Supabase agent_logs Gate (Every Task, Non-Negotiable)

**From CLAUDE.md workspace rule + gap §7 + dispatch package + design spec:** Every specialist (alex/maya/jordan/dev/sam) or swarm member **MUST insert a row into `agent_logs` BEFORE sending any final reply, Discord post, Telegram summary, PR, or "task done" declaration.** A task is not complete until this log is written. Failed tasks *still log* (`status: "failed"`).

**Exact curl (copy-paste from dispatch/CLAUDE; one retry max on transient; surface blocker if persistent failure):**

```bash
curl -sS -X POST 'https://twwmqqgjtdbcvrkinifa.supabase.co/rest/v1/agent_logs' \
  -H 'apikey: sb_publishable_amzArN-PtOSPCQQVNtOVaw_geB8qjzL' \
  -H 'Authorization: Bearer sb_publishable_amzArN-PtOSPCQQVNtOVaw_geB8qjzL' \
  -H 'Content-Type: application/json' \
  -H 'Prefer: return=minimal' \
  --data '{"agent_name":"<alex|jordan|dev|sam|maya|orchestrator>","task_description":"<one-sentence summary of THIS card/task with citations>","model_used":"<claude-4.5-opus|your-model-id>","status":"completed"}'
```

**Per-card examples (from dispatch package; adapt for your task):**
- For stack (jordan): `{"agent_name":"jordan","task_description":"Expanded docs/stack/EXPO_ROUTER_AUTH_NOTIFS_HAPTICS_2026.md to full prose per gap §6 Outline 1 + verbatim MCP 2026-05-28 facts (Context7 expo_dev 86.3)","model_used":"claude-4.5-opus","status":"completed"}`
- For hygiene/AGENTS (sam/orchestrator): `{"agent_name":"sam","task_description":"Authored root AGENTS.md + all OSS hygiene (.github templates, LICENSE, CONTRIBUTING, SECURITY, CODE_OF_CONDUCT, CHANGELOG) + index updates per dispatch DOC-007/011/012 + design spec §1/7 + gap §3/5/6 Outline 7 + CLAUDE.md; 2026-05-28 full pre-scaffold state","model_used":"claude-4.5-opus","status":"completed"}`
- For legal (alex): `{"agent_name":"alex","task_description":"Full AU Fair Work 2026 pay transparency doc per gap §6 Outline 3 + browser snapshot 2026-05-27 (pay sections, 117 interactive)","model_used":"claude-4.5-opus","status":"completed"}`

**Enforcement:** 
- Orchestrator (or human) verifies logs via Supabase dashboard / REST query *before* synthesis/close.
- No log row = task not accepted for review/synth (re-dispatch after log).
- PR template + CONTRIBUTING enforce "agent_logs row inserted?" checkbox for agent work.
- Anti-pattern: Skipping gate (immediate fail per dispatch "Anti-Patterns").

---

## Architect-Developer Protocol (Operating Protocol)

**Source:** `docs/prompts/2026-05-30-ai-model-system-prompts.md`

Every AI-assisted engineering task on Hi-Hired follows a mandatory 3-phase pipeline. No code is produced before the blueprint is complete. No code ships before self-correction review passes.

### Phase 1: Systemic Blueprint

Before any code, establish these 4 elements:

| Element | What it covers |
|---------|---------------|
| **Intent** | Business/user value — why build this, for whom |
| **Constraints** | Performance targets, security model, tech stack mandates, compatibility, regulatory |
| **Data Contract** | Input schemas, output schemas, error specifications |
| **Success Criteria** | Acceptance criteria, performance benchmarks, test coverage, observability |

Output a **Technical Schema** block: data flow, component boundaries, algorithm selection with complexity analysis, state management approach.

### Phase 2: Complete Implementation

Rules: **EXHAUSTIVE** (no placeholders/truncation), **TYPE-SAFE** (no `any`), **ERROR-BUSTER** (every failure path handled), **TONE-STRIPPED** (ship code + rationale + tests, nothing else).

### Phase 3: 4-Lens Self-Correction

| Priority | Lens | What to check |
|----------|------|---------------|
| 1st 🛡️ | Security Auditor | Injections, auth bypasses, PII exposure, CSRF/XSS |
| 2nd ⚡ | Performance Engineer | Big-O, N+1 queries, caching misses, blocking I/O |
| 3rd 🔁 | Reliability Engineer | Error handling, race conditions, timeouts, circuit breakers |
| 4th 🧹 | Maintainability Review | Duplication, type hints, naming, coupling, test coverage |

**Conflict resolution:** Security > Reliability > Performance > Maintainability

See `architect-developer-protocol` Hermes skill for the full implementation.

---

## Dispatch & Execution (Parallel Authoring, Anti-Drift)

**Primary source:** [docs/research/swarm-dispatch-2026-05-28-full-docs.md](docs/research/swarm-dispatch-2026-05-28-full-docs.md) (self-contained task cards DOC-00X with full instructions, reads, verbatim 2026 facts, DRY rules, acceptance criteria, exact log gate). Design spec § "Swarm Execution Model" + gap §7 for overview.

**How to dispatch a card (copy-paste into prompt or --message):**
1. Read the exact card from dispatch (e.g. DOC-2026-05-28-001 for EXPO_ stack).
2. Include: "Execute DOC-2026-05-28-XXX per docs/research/swarm-dispatch-2026-05-28-full-docs.md. Full instructions: [paste or 'see §DOC-XXX']. Read required (gap §6 Outline X + STACK/BACKEND first 100 + ...). Cite MCP/browser 2026-05-28 verbatim. DRY (reference not duplicate). Run exact log curl as LAST action before any final output."
3. For parallel: Multiple agents in isolated terminals/tmux/worktrees (ruflo best for anti-drift + observability).

**Option 1: Ruflo / Claude-Flow (recommended for true parallel + anti-drift + monitor-stream)**
```bash
# Init hierarchical swarm (from ruflo swarm-init skill)
npx @claude-flow/cli@latest swarm init --topology hierarchical --max-agents 6 --strategy specialized

# Spawn + send full card text (or "Execute DOC-... per attached dispatch")
# Monitor: mcp__claude-flow__swarm_status or ruflo monitor-stream skill
```
See /root/.cursor/plugins/cache/ruflo/... skills (swarm-init, monitor-stream) + claude-flow docs. Use task graph to isolate (legal alex independent of stack jordan; no shared mutable state per DRY outlines).

**Option 2: OpenClaw Parallel (current workspace default per CLAUDE.md)**
Run in parallel shells/tmux (or background & wait):
```bash
openclaw agent --agent jordan --message "Execute DOC-2026-05-28-001: EXPO_ROUTER... per attached swarm-dispatch-2026-05-28-full-docs.md §DOC-001. Cite Context7 expo_dev 86.3 2026-05-28. Insert agent_logs row on complete (use exact curl from dispatch)."

# Repeat for alex (legal 003+004), dev (hygiene 011 + adapt), sam (012 + qa), etc.
# Coordinator: openclaw message read on lanes + poll agent_logs
```

**Option 3: Manual (no infra):** Human 1:1 assigns via Telegram/Discord/Linear; agent pastes card into session, runs curl as last, posts "DOC-00X complete, log row <id>" + diff.

**Prep Checklist (orchestrator/human, ~30min before launch):**
- [ ] gap + dispatch + manifest + design spec reviewed/approved (Discord #planning or Telegram)
- [ ] Stubs/dirs exist (Glob confirm per gap §9)
- [ ] Supabase agent_logs writable (test one curl with publishable key)
- [ ] OpenClaw/ruflo/MCP env ready
- [ ] Indexes point to gap (already done 2026-05-28)

**This swarm (2026-05-28) as canonical example:** Dispatch package (12+ MUST cards: stack-deep 001-004/010, legal 003-004, ops 005, api 006, AGENTS 007, manifest 008, hygiene 011-012) executed in parallel by lanes (minimal shared state via explicit DRY + "log question to coord"). Synthesis: verify logs, collect diffs vs outlines/ACs, resolve rare overlaps, update manifest/gap §6 "Implemented 2026-05-28 by <lane> via DOC-00X", human legal signoff on AU docs, close in Discord. See dispatch "Coordination Instructions" + "Final Synthesis Step".

**Anti-drift / Overlap Handling (enforce in every dispatch):**
- DRY + "reference only" in cards/outlines makes overlaps rare (e.g. notif details in EXPO_ + EDGE_PROCESSOR + reference from NOTIFICATIONS.md adapt later).
- If suspected: Agent logs "Question for coord: overlap with DOC-00X on <topic>?" to lane + waits. Coordinator arbitrates ("put in X, ref from Y").
- No agent edits another agent's target file.
- Ruflo monitor-stream for live events + anti-drift config.
- Self-review (brainstorming skill checklist) by each author before gate.
- Orchestrator final consistency pass vs design spec + gap outlines + dispatch ACs.

**Anti-patterns (immediate fail/re-dispatch):**
- Skipping log gate
- Inventing 2026 facts (must cite MCP/browser/gap §8 with exact dates/paths: Context7 /websites/expo_dev 86.3 2026-05-28, cursor-ide-browser fairwork 2026-05-27 snapshot, local 2026-05-28 Glob/Read/Grep/Shell)
- Duplicating content (DRY violation = reject in review)
- Scope creep (only target file + its outline; no code, no SHOULD unless spillover approved)
- Assuming shared state (each card re-states its reads/facts)
- Long-running without progress (monitor-stream detects)

---

## How to Use for Future Work (Gap Refresh, Code Tasks, Quarterly Audit)

1. **Gap refresh / new research:** Orchestrator re-runs local Glob/Read/Grep + authorized MCP (context7 for libraries, cursor-ide-browser/firecrawl per rules for web). Updates gap-analysis + manifest + relevant outlines. Dispatches affected DOC- cards (e.g. new Expo SDK → refresh stack/ EXPO_ + TANSTACK_).
2. **Code task (post-scaffold):** Use same lanes (jordan for arch/RLS/Edge changes, dev for RN impl, sam for tests). Cards reference canonicals (STACK/BACKEND) + new stack-deep docs + ARCH fixes. Always log gate.
3. **Quarterly re-audit:** Per gap §9 + manifest notes. Trigger on major (new SDK, Fair Work amendment, Privacy Act change, post-v1). Orchestrator dispatches "re-audit X" to alex/jordan/sam; appends to research-notes/; updates indexes.
4. **.github/AGENT_TASK_TEMPLATES/ (NICE, future):** Store reusable card templates for common patterns (doc expansion, RLS review, a11y audit).

**Example future dispatch (code):** `openclaw agent --agent dev --message "Implement Expo Router auth groups + SecureStore supabase init per docs/stack/EXPO_ROUTER..._2026.md + BACKEND auth adapt + MCP 2026-05-28 facts. Add haptics on swipe per GUARDRAILS. Log gate on complete."`

---

## Verification / Success (Zero-Blockers Test for Swarm Ops)

A fresh coordinator (human or agent) can:
1. Read AGENTS + CONTRIBUTING + gap §7 + design "Swarm Execution Model" + one dispatch card.
2. Correctly draft a parallel dispatch (e.g. legal alex + stack jordan independent).
3. Know exact curl + that it is mandatory before final (with example task_description tying to outline + 2026 cite).
4. Understand anti-drift (DRY + monitor + coord arbitration) and synthesis steps (logs verify → diffs vs ACs → manifest/gap update → human signoff).
5. Navigate Structure B (root hygiene/AGENTS + docs/ depth + foundational/ history) via indexes.

**Orchestrator post-swarm checklist (this 2026-05-28 execution):** All MUST logs present with correct descriptions/status; files match outlines/ACs (no drift); indexes + manifest updated with "Full 2026-05-28 by <lane> via swarm"; zero-blockers test passes for new dev/agent; human legal signoff on AU docs; close in Discord + Telegram.

See design spec "Verification / Acceptance Criteria (The 'New Dev or Agent Has Zero Blockers' Test)" (10 explicit checklist items) + dispatch "Success Criteria".

---

## References (DRY — Read These, Do Not Duplicate)

- **Dispatch package:** docs/research/swarm-dispatch-2026-05-28-full-docs.md (cards DOC-007/011/012 for AGENTS/hygiene, exact log templates, coordination, launch options, anti-patterns)
- **Design spec:** docs/superpowers/specs/2026-05-28-hi-hired-complete-docs-design.md (locked Structure B + Approach 2 Parallel Swarm + Full scope; §1 Hygiene & OSS detailed requirements for LICENSE/CONTRIBUTING/CODE_OF_CONDUCT/SECURITY/CHANGELOG/.github/AGENTS; § "Swarm Execution Model" with lanes table + gate + steps + risks + verification; §3/4/5/7/9 for rationale/indexes)
- **Gap analysis:** docs/research/gap-analysis-2026-05-28.md (§1 35-file catalog, §2 architecture map, §3 complete set + hygiene rationale, §4 Structure B diagram/rationale, §5 tiers, §6 Outline 7 AGENTS + other outlines, §7 mini swarm plan + logging + anti-patterns, §8 2026 citations with tool paths, §9 artifacts + index updates)
- **CLAUDE.md** (/home/admin/CLAUDE.md): Specialist lanes table (exact IDs/Discord), routing shortcuts, mandatory agent_logs gate (exact curl), OpenClaw architecture (orchestrator + specialists), Discord channels, default stack (Expo/Supabase/TanStack etc — matches STACK.md)
- **required-docs-manifest.md:** rows 1-10 (hygiene + AGENTS), 39 (swarm), 41-43 (indexes) — update on every authoring
- **Indexes (updated 2026-05-28):** root README "Pre-build docs audit complete 2026-05-28" + "Full docs complete" + Next Step; docs/README structure + pointers; foundational-docs/README "2026-05-28 Pre-Build Docs Audit" + 04-legal note + gap links (preserves authority guide)
- **Other:** STACK.md (canonical tech), docs/BACKEND.md (schema/Edge/RLS/migrations), foundational-docs/README.md (authority + divergences), ARCHITECTURE_AUDIT.md (CRITICAL gaps addressed in docs), 02-mvp-definition.md (scope), GUARDRAILS.md (a11y/Privacy), docs/legal/ + docs/stack/ + docs/ops/ + docs/api/ (2026 deep refs + runbooks + contracts)
- **Skills (for ruflo/OpenClaw):** /root/.cursor/plugins/cache/ruflo/... (swarm-init/monitor-stream), superpowers (brainstorming/writing-plans/executing-plans/subagent-driven-development for parallel), ce- (compound engineering for review/synth)

**Citations for this file (2026-05-28):** design spec §1/7, gap-analysis-2026-05-28.md §3/5/6 Outline 7/§7/§8/§9, swarm-dispatch-2026-05-28-full-docs.md DOC-007/011/012 + "Mandatory ... Gate" + "Coordination Instructions", CLAUDE.md (full lanes/gate/table), Context7 /websites/expo_dev 86.3 + /supabase/supabase 82.6 2026-05-28, cursor-ide-browser fairwork 2026-05-27 snapshot.

---

**2026-05-28 Full Hygiene + AGENTS + Indexes Complete:** Per swarm (orchestrator + sam lanes) autonomous execution of dispatch cards + design + gap. All MUST hygiene in place (8 root + .github/); AGENTS.md practical swarm guide; indexes reflect Structure B + "Full docs complete 2026-05-28" + layered docs/ + zero-blockers pointers. DRY, cited, consistent voice, agent/human-friendly, Australian compliance + agent-orchestrated DNA. New contributor/coordinator reads this + CONTRIBUTING + gap + manifest + indexes = can dispatch/synth/enforce without hunting CLAUDE or re-reading 35 files.

**Recommendations for swarm (human review):** .github/ templates (esp. legal_update.md + PR checklist) should be reviewed by human compliance/legal before first real PRs (they encode high-stakes a11y/RLS/PII/audit requirements). AGENTS.md + dispatch package are living — update on new patterns (e.g. post-ruflo adoption). Re-audit gap/AGENTS on major changes.

*Maintained via required-docs-manifest + gap triggers. Orchestrator gate + human signoff before scaffold. See dispatch "End of Dispatch Package" + design spec "End of design spec".*