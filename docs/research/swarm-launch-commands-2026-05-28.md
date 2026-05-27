# Hi-Hired Swarm Launch Commands — Full Docs Authoring (2026-05-28)

**Purpose:** Short, copy-paste ready commands for the human/orchestrator to kick off the parallel authoring swarm **after** user approves the design spec + this dispatch package + gap-analysis-2026-05-28.md.

**Primary Artifact:** See `swarm-dispatch-2026-05-28-full-docs.md` (mission briefing, 12 self-contained task cards DOC-001..012, exact log gate, coordination rules, acceptance criteria).

**Prerequisites (run once, confirm green):**
- gap + dispatch + manifest + stubs (from gap §9) reviewed and approved in Discord #planning or by user.
- Supabase `agent_logs` writable with publishable key (quick test curl from dispatch package).
- OpenClaw CLI or ruflo/claude-flow env available for target lanes (alex/jordan/dev/sam/maya).
- tmux / multiple terminals ready for true parallel (recommended).

---

## Option 1: Ruflo / Claude-Flow Swarm (True Parallel + Anti-Drift — Preferred)

```bash
# Terminal 1 — Init the swarm (hierarchical, 6 agents max, specialized strategy)
npx @claude-flow/cli@latest swarm init --topology hierarchical --max-agents 6 --strategy specialized

# (In Claude Code session with MCP claude-flow + ruflo skills enabled)
# Use TeamCreate to create "hi-hired-docs-swarm-2026-05-28"
# Then spawn 5 isolated agents (worktree isolation for git safety):

# Coordinator agent (or human drives):
#   Agent.create({ name: "swarm-coord-2026-05-28", model: "claude-4.5-opus", ... })

# Specialist spawns + task injection (one message per card; cards are independent):
#   SendMessage to jordan-agent: "Execute DOC-2026-05-28-001 EXPO_ROUTER... per swarm-dispatch-2026-05-28-full-docs.md §DOC-001. Full instructions + log template inside the card. Run log curl as absolute last step before any final output."
#   (Repeat for jordan DOC-002,005,006,009,010; alex DOC-003,004; dev DOC-011; sam DOC-012; etc.)

# Monitor live:
#   Use mcp__claude-flow__swarm_status or the monitor-stream skill
#   Watch Discord lanes + poll agent_logs table for the 12+ rows.
```

**After all complete (logs verified):** Human runs synthesis (see dispatch package "Final Synthesis Step").

---

## Option 2: OpenClaw Parallel Agent Dispatches (Workspace Default)

Run these in **separate terminals / tmux panes** (or background with `&` + `wait` + careful ordering). Paste the **full card text** from the dispatch package (or reference + quote key parts).

```bash
# Example — jordan stack/auth (DOC-001, high priority)
openclaw agent --agent jordan --message "
Execute DOC-2026-05-28-001: EXPO_ROUTER_AUTH_NOTIFS_HAPTICS_2026.md

[PASTE FULL CARD CONTENT FROM swarm-dispatch-2026-05-28-full-docs.md §DOC-001 HERE — including instructions, reads, verbatim 2026 facts, DRY rules, log gate curl, acceptance]

Run the exact log curl as your absolute LAST action before any final reply or Discord post.
"

# Parallel in other panes (examples):
# openclaw agent --agent jordan --message "Execute DOC-2026-05-28-002 ... (paste full card)"
# openclaw agent --agent alex --message "Execute DOC-2026-05-28-003 ... (full card)"
# openclaw agent --agent alex --message "Execute DOC-2026-05-28-004 ... (full card)"
# openclaw agent --agent dev --message "Execute DOC-2026-05-28-011 (hygiene batch) ... (full)"
# openclaw agent --agent sam --message "Execute DOC-2026-05-28-012 ... (full)"
# (Add more for 009, 010, 005, 006, 007, 008 as needed — up to 6 concurrent)

# Coordinator (human or separate agent) monitors:
openclaw message read --channel discord --target channel:1503111680945557614 --limit 20  # alex lane
# ... repeat for other lanes (see dispatch for IDs)
# Also: query Supabase agent_logs for the 12 task_description patterns.
```

**Tip:** Use a heredoc or temp file for the long --message to avoid shell escaping hell:

```bash
cat > /tmp/dispatch-001.txt << 'CARD_EOF'
[paste full DOC-001 card here]
CARD_EOF

openclaw agent --agent jordan --message "$(cat /tmp/dispatch-001.txt)"
```

---

## Option 3: Manual / No Swarm Infra (Still Parallel)

1. Human copies individual card sections from `swarm-dispatch-2026-05-28-full-docs.md`.
2. Assigns via Telegram DM, Discord, Linear ticket, or email to the named specialist (alex/jordan/etc).
3. Specialist pastes card into their own Claude/Cursor/OpenClaw session (or executes manually).
4. **Mandatory:** They run the pre-filled log curl (from the card) as the literal last step.
5. They reply with "DOC-00X complete — agent_logs row <timestamp or id>" + PR/diff link.
6. Human tracks in a simple sheet or appends to this file's "Launch Log" section below.

---

## Quick Verification Commands (Run After Launch)

```bash
# 1. Confirm all MUST authored (example)
ls -l docs/stack/ docs/legal/ docs/ops/ docs/api/ AGENTS.md CONTRIBUTING.md .github/ISSUE_TEMPLATE/ .github/PULL_REQUEST_TEMPLATE.md 2>/dev/null | cat

# 2. Check agent_logs (via curl or Supabase dashboard / SQL)
curl -sS 'https://twwmqqgjtdbcvrkinifa.supabase.co/rest/v1/agent_logs?select=*&order=created_at.desc&limit=20' \
  -H 'apikey: sb_publishable_amzArN-PtOSPCQQVNtOVaw_geB8qjzL' \
  -H 'Authorization: Bearer sb_publishable_amzArN-PtOSPCQQVNtOVaw_geB8qjzL' | head -c 2000

# 3. Git status for new/edited docs
git status --porcelain docs/ AGENTS.md CONTRIBUTING.md LICENSE CHANGELOG.md CODE_OF_CONDUCT.md SECURITY.md .github/

# 4. Manifest + gap synthesis (manual or via human edit)
#    - Update required-docs-manifest.md statuses to "full"
#    - Append "Implemented 2026-05-28 by <lane> via DOC-00X" to each §6 outline in gap-analysis
```

---

## Launch Log (Human Fills After Approval)

- [ ] 2026-05-28 HH:MM — User approved design spec + dispatch package + gap.
- [ ] 2026-05-28 HH:MM — Prep checklist complete (stubs, log gate test, env).
- [ ] 2026-05-28 HH:MM — Swarm launched via [ruflo | openclaw | manual].
- [ ] ... (track per-lane starts)
- [ ] 2026-05-28/29 HH:MM — All 12+ logs verified in agent_logs.
- [ ] 2026-05-29 HH:MM — Synthesis complete, indexes updated, legal signoff.
- [ ] 2026-05-29 HH:MM — "Scaffold approved" posted. Monorepo init unlocked.

**One-liner to human after all green:** "Package complete. All MUST docs authored + logged per dispatch. Ready for scaffold per STACK + MIGRATION_RUNBOOK."

---

*End of launch commands. See swarm-dispatch-2026-05-28-full-docs.md for the actual task cards and full coordination rules.*
