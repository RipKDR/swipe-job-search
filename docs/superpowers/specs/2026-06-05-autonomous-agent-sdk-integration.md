# Autonomous Agent SDK Integration for Hi-Hired

**Date:** 2026-06-05  
**Project:** swipe-job-search (Hi-Hired)  
**Scope:** Build autonomous agents using Claude Agent SDK to improve swipe-job-search and upgrade openclaw specialists

---

## Overview

Hi-Hired and OpenClaw benefit from three new autonomous agents powered by the Claude Agent SDK:

1. **Specialist Agent Enhancement** — Upgrade Alex, Maya, Jordan, Dev, Sam with autonomous reasoning (internal only; user interface unchanged)
2. **Autonomous Code Improvement Agent** — Proactively analyzes and improves swipe-job-search codebase
3. **Meta-Router/Coordinator** — Intelligently decides what needs work across both projects

Users interact with specialists the same way; behind the scenes, agents think deeper and execute autonomously.

---

## Specialist Agent Enhancement

### Current State
- Alex, Maya, Jordan, Dev, Sam respond to user prompts
- Each returns analysis/implementation in one turn
- Reactive: user asks, agent answers

### Enhancement
- Keep the same interface (user messages, agent responds)
- **Internally**, each specialist uses Agent SDK to:
  - Break down problems into subtasks
  - Execute multi-step workflows autonomously (research → analysis → implementation)
  - Self-correct if issues arise
  - Think through trade-offs before responding

### Example (Dev agent)
- User: `/dev implement payment flow`
- Dev (internally): Analyzes current codebase → plans architecture → implements → tests → reviews → responds with solution
- User sees: Same conversational response, but it's the result of autonomous reasoning

### Implementation
- Each specialist gets an Agent SDK wrapper
- The wrapper orchestrates their work using tools: code analysis, testing, git, Supabase queries
- Specialists remain deployable as OpenClaw agents (no interface change)

---

## Autonomous Code Improvement Agent

### Purpose
Proactively improves swipe-job-search without user prompts. Runs independently (scheduled or on-demand).

### Scope
- **Type Safety:** Fixes TypeScript strict mode violations
- **Test Coverage:** Identifies untested code, writes tests
- **Performance:** Detects memory leaks, optimize queries, reduce bundle size
- **Architecture:** Simplifies tangled dependencies, refactors over-large files
- **Security:** Flags PII exposure, insecure API usage, auth gaps
- **Dependencies:** Updates when safe, removes unused packages

### Execution
1. **Analyze**: Scan codebase (type errors, test gaps, bundle size, dependency health)
2. **Plan**: Identify top 3–5 improvements by impact
3. **Execute**: Autonomously fix each, run tests, commit
4. **Report**: Log what was improved, why, and impact

### Frequency
- **On-demand**: User can trigger via CLI (`/improve-code`)
- **Scheduled**: Runs daily/weekly via cron to keep repo healthy

### Integration with swipe-job-search
- Lives as `.claude/agents/code-improver/agent.ts`
- Triggered by a cron job or hook (e.g., post-commit)
- Commits go to a branch (`auto/code-improvements`) so user can review/merge

---

## Meta-Router/Coordinator Agent

### Purpose
Watches both swipe-job-search and openclaw, decides what needs work, routes intelligently.

### Capabilities
- **Pattern Learning:** Learns what issues recur, what specialists handle well
- **Priority Routing:** Decides whether Alex (research) or Dev (code) is best for a task
- **Proactive Suggestions:** Flags upcoming work ("refactor payment logic before adding billing")
- **Cross-Project Sync:** Coordinates shared dependencies between projects

### Example Workflow
1. Router monitors swipe-job-search build logs, test failures, code metrics
2. Sees: "Type errors in auth module, 60% test coverage, 3MB bundle bloat"
3. Decides: "Dev should refactor auth module, code-improver should optimize bundle"
4. Routes work, tracks progress, reports to user

### Integration
- Runs as OpenClaw agent or standalone CLI
- Accessible via `/router status` or `openclaw agent --agent router --message "..."`
- Reports daily/weekly summary (top issues, improvements, recommendations)

---

## Architecture

### Agent SDK Usage
```
┌─────────────────────────────────────┐
│     OpenClaw (Main Session)         │
│  - Alex, Maya, Jordan, Dev, Sam     │
└────────────────┬────────────────────┘
                 │
        ┌────────┴────────┐
        ▼                 ▼
   ┌─────────────┐  ┌──────────────────┐
   │  Specialists│  │ Meta-Router      │
   │  (Enhanced) │  │ (Coordinator)    │
   │ SDK-wrapped │  │                  │
   └────┬────────┘  └────────┬─────────┘
        │                    │
        │         ┌──────────┴──────────┐
        │         ▼                     ▼
        │    ┌──────────────┐      ┌─────────────────┐
        │    │ Swipe-Job    │      │ OpenClaw        │
        │    │ Search       │      │ Workspace       │
        │    │ Codebase     │      │ (Configs,       │
        │    └──────────────┘      │  Agents, Docs)  │
        │                          └─────────────────┘
        │
        ▼
   ┌──────────────────────────────────┐
   │  Code Improver Agent (SDK)       │
   │  - Analyzes codebase             │
   │  - Autonomously improves         │
   │  - Commits to auto/* branches    │
   └──────────────────────────────────┘
```

### File Structure
```
swipe-job-search/
├── .claude/
│   ├── agents/
│   │   ├── code-improver/
│   │   │   ├── agent.ts              (main Agent SDK wrapper)
│   │   │   ├── tools.ts              (codebase analysis tools)
│   │   │   └── config.ts             (scope, frequency, rules)
│   │   └── router/
│   │       ├── agent.ts              (meta-coordinator)
│   │       └── routes.ts             (routing rules)
│   └── settings.local.json
├── docs/
│   ├── superpowers/
│   │   └── specs/
│   │       └── 2026-06-05-autonomous-agent-sdk-integration.md (this file)
│   └── Agent SDK setup & patterns
└── [rest of project unchanged]

openclaw/
├── workspace-docs/
│   ├── AGENTS.md                     (specialist definitions, now with SDK wrappers)
│   └── agent-sdk-integration.md      (new: how specialists use SDK internally)
└── [rest unchanged]
```

---

## Implementation Plan

### Phase 1: Foundation (Days 1–2)
- Set up Agent SDK project structure in `.claude/agents/`
- Create code-improver agent (analyze only, no fixes yet)
- Test on swipe-job-search codebase

### Phase 2: Code Improver Execution (Days 3–4)
- Implement autonomous fixes (type safety, tests, performance)
- Test commit & review workflow
- Set up cron trigger

### Phase 3: Specialist Enhancement (Days 5–6)
- Wrap Dev agent with SDK logic
- Extend to other specialists (Alex, Maya, Jordan, Sam)
- Test in openclaw environment

### Phase 4: Meta-Router (Days 7–8)
- Build coordinator agent
- Integrate with both projects
- Test routing & decision-making

### Phase 5: Polish & Deploy (Days 9–10)
- Finalize all agents
- Write deployment guide
- Document for future sessions

---

## Success Criteria

- ✅ Specialists respond unchanged to user; internally use SDK
- ✅ Code improver autonomously fixes 5+ categories of issues
- ✅ Code improver commits are clean, well-documented, mergeable
- ✅ Meta-router accurately routes work, learns patterns
- ✅ All agents handle errors gracefully
- ✅ Zero disruption to current openclaw/swipe-job-search workflows

---

## Known Constraints

- Agents run in cloud/local environment (must respect network policy)
- Code improver must not break builds (always test before commit)
- Specialist enhancement must not change API or response format (internal only)
- Meta-router decisions logged for auditability
