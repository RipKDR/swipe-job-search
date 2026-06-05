# Hi-Hired Autonomous Agents

Three agents powered by the Claude Agent SDK to autonomously improve Hi-Hired:

## Code Improver Agent
Analyzes the codebase and autonomously improves:
- Type safety
- Test coverage
- Performance
- Security
- Dependencies

### Run
```bash
pnpm code-improver
```

### How It Works
1. Analyzes swipe-job-search codebase
2. Uses Agent SDK to think through improvements
3. Creates `auto/code-improvements` branch
4. Reports findings

## Meta-Router Agent
Intelligently routes work across both projects.

### Run
```bash
pnpm router
```

### How It Works
1. Analyzes codebase health
2. Uses Agent SDK to decide what matters most
3. Routes work to appropriate specialists
4. Learns from past routing decisions

## Specialist Enhancement
Alex, Maya, Jordan, Dev, Sam use Agent SDK internally (no interface changes).

---

## Setup

```bash
cd .claude/agents
pnpm install
pnpm typecheck
```

## Environment
Create `.env` based on `.env.example`:
```
ANTHROPIC_API_KEY=your_key
```

---

For detailed implementation info, see the task plan in `docs/superpowers/plans/`.
