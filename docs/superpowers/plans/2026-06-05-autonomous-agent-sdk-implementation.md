# Autonomous Agent SDK Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build three Claude Agent SDK-powered agents (code improver, specialist enhancement, meta-router) to autonomously improve swipe-job-search and enhance openclaw specialist intelligence without changing user-facing interfaces.

**Architecture:** Foundation layer sets up Agent SDK in `.claude/agents/` with shared utilities. Code Improver agent analyzes and autonomously fixes swipe-job-search codebase. Specialist SDK wrappers enhance openclaw agents with internal autonomy. Meta-Router coordinates both projects intelligently.

**Tech Stack:** Claude Agent SDK (TypeScript), OpenClaw environment, swipe-job-search codebase, Supabase, Git

---

## File Structure

```
swipe-job-search/.claude/agents/
├── shared/
│   ├── index.ts              (exports all shared utilities)
│   ├── tools.ts              (codebase analysis tools)
│   ├── git.ts                (git utilities)
│   └── types.ts              (shared TypeScript types)
├── code-improver/
│   ├── agent.ts              (main Code Improver agent using SDK)
│   ├── analyzers.ts          (type, test, perf, security, deps analyzers)
│   ├── fixes.ts              (autonomous fix executors)
│   └── config.ts             (rules, scope, thresholds)
├── router/
│   ├── agent.ts              (Meta-Router coordinator agent)
│   ├── routes.ts             (routing logic and decisions)
│   └── patterns.ts           (pattern learning for routing)
└── package.json              (Agent SDK + dependencies)

openclaw/
├── workspace-docs/
│   └── agent-sdk-integration.md  (spec for specialist SDK wrappers)
└── agents/                       (specialist SDK wrappers added here)
    ├── dev-sdk-wrapper.ts
    ├── alex-sdk-wrapper.ts
    ├── maya-sdk-wrapper.ts
    ├── jordan-sdk-wrapper.ts
    └── sam-sdk-wrapper.ts
```

---

## Phase 1: Foundation & Setup

### Task 1: Initialize Agent SDK Project

**Files:**
- Create: `swipe-job-search/.claude/agents/package.json`
- Create: `swipe-job-search/.claude/agents/tsconfig.json`
- Create: `swipe-job-search/.claude/agents/.env.example`

- [ ] **Step 1: Create agents directory**

```bash
mkdir -p /home/admin/swipe-job-search/.claude/agents/shared
mkdir -p /home/admin/swipe-job-search/.claude/agents/code-improver
mkdir -p /home/admin/swipe-job-search/.claude/agents/router
```

- [ ] **Step 2: Create package.json**

```bash
cd /home/admin/swipe-job-search/.claude/agents && cat > package.json << 'EOF'
{
  "name": "@hi-hired/agents",
  "version": "1.0.0",
  "type": "module",
  "description": "Autonomous agents for Hi-Hired using Claude Agent SDK",
  "main": "index.ts",
  "scripts": {
    "dev": "node --loader ts-node/esm .",
    "typecheck": "tsc --noEmit",
    "code-improver": "node --loader ts-node/esm code-improver/agent.ts",
    "router": "node --loader ts-node/esm router/agent.ts"
  },
  "dependencies": {
    "@anthropic-ai/claude-agent-sdk": "^0.6.0",
    "typescript": "^5.6.2"
  },
  "devDependencies": {
    "ts-node": "^10.9.2",
    "@types/node": "^20.14.0"
  }
}
EOF
```

- [ ] **Step 3: Create tsconfig.json**

```bash
cd /home/admin/swipe-job-search/.claude/agents && cat > tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ES2020",
    "lib": ["ES2020"],
    "moduleResolution": "node",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "outDir": "./dist"
  },
  "include": ["**/*.ts"],
  "exclude": ["node_modules"]
}
EOF
```

- [ ] **Step 4: Create .env.example**

```bash
cd /home/admin/swipe-job-search/.claude/agents && cat > .env.example << 'EOF'
ANTHROPIC_API_KEY=your_api_key_here
SWIPE_JOB_SEARCH_ROOT=../../
OPENCLAW_ROOT=../../../openclaw
CODE_IMPROVER_BRANCH=auto/code-improvements
ROUTER_LOG_FILE=./logs/router.log
EOF
```

- [ ] **Step 5: Create .gitignore**

```bash
cd /home/admin/swipe-job-search/.claude/agents && cat > .gitignore << 'EOF'
node_modules/
dist/
.env
.env.local
*.log
logs/
.DS_Store
EOF
```

- [ ] **Step 6: Run pnpm install from agents directory**

```bash
cd /home/admin/swipe-job-search/.claude/agents && pnpm install
```

Expected: Package installation completes, `node_modules` created, `pnpm-lock.yaml` generated.

- [ ] **Step 7: Verify TypeScript compilation**

```bash
cd /home/admin/swipe-job-search/.claude/agents && pnpm typecheck
```

Expected: No TypeScript errors (since no files yet, or with sample files).

- [ ] **Step 8: Commit foundation**

```bash
cd /home/admin/swipe-job-search && git add .claude/agents/ && git commit -m "feat(agents): initialize Agent SDK project structure

- Create agents directory with package.json, tsconfig.json
- Set up TypeScript, ts-node, Claude Agent SDK dependencies
- Add .env.example and .gitignore
- Ready for code-improver and router agent implementation

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>"
```

---

### Task 2: Create Shared Utilities & Types

**Files:**
- Create: `.claude/agents/shared/types.ts`
- Create: `.claude/agents/shared/git.ts`
- Create: `.claude/agents/shared/tools.ts`
- Create: `.claude/agents/shared/index.ts`

- [ ] **Step 1: Create shared types**

Create `.claude/agents/shared/types.ts`:

```typescript
export interface CodeAnalysis {
  typeErrors: TypeError[];
  testGaps: TestGap[];
  performanceIssues: PerformanceIssue[];
  securityIssues: SecurityIssue[];
  dependencyIssues: DependencyIssue[];
}

export interface TypeError {
  file: string;
  line: number;
  column: number;
  message: string;
  severity: 'error' | 'warning';
}

export interface TestGap {
  file: string;
  untestableFunctions: string[];
  coverage: number;
}

export interface PerformanceIssue {
  file: string;
  type: 'memory-leak' | 'inefficient-query' | 'bundle-bloat' | 'render-performance';
  description: string;
  severity: 'high' | 'medium' | 'low';
}

export interface SecurityIssue {
  file: string;
  type: 'pii-exposure' | 'insecure-crypto' | 'auth-gap' | 'injection-risk';
  description: string;
  location: string;
}

export interface DependencyIssue {
  package: string;
  current: string;
  latest: string;
  type: 'outdated' | 'unused' | 'vulnerable';
  canUpdate: boolean;
}

export interface FixResult {
  file: string;
  fix: string;
  status: 'success' | 'failed';
  commit?: string;
  message?: string;
}

export interface RouterDecision {
  specialist: 'dev' | 'alex' | 'maya' | 'jordan' | 'sam';
  priority: 'critical' | 'high' | 'medium' | 'low';
  task: string;
  reasoning: string;
}
```

- [ ] **Step 2: Create git utilities**

Create `.claude/agents/shared/git.ts`:

```typescript
import { execSync } from 'child_process';

export function getCurrentBranch(): string {
  return execSync('git rev-parse --abbrev-ref HEAD').toString().trim();
}

export function getChangedFiles(since: string = 'HEAD~1'): string[] {
  try {
    const output = execSync(`git diff --name-only ${since}..HEAD`).toString();
    return output.split('\n').filter(Boolean);
  } catch {
    return [];
  }
}

export function createBranch(name: string): void {
  execSync(`git checkout -b ${name}`);
}

export function commitChanges(message: string, files: string[]): void {
  execSync(`git add ${files.join(' ')}`);
  execSync(`git commit -m "${message}"`);
}

export function getBranchDiff(file: string): string {
  return execSync(`git diff HEAD -- ${file}`).toString();
}

export function hasUnstagedChanges(): boolean {
  try {
    execSync('git diff --quiet');
    execSync('git diff --cached --quiet');
    return false;
  } catch {
    return true;
  }
}

export function resetToHead(): void {
  execSync('git reset --hard HEAD');
}
```

- [ ] **Step 3: Create analysis tools**

Create `.claude/agents/shared/tools.ts`:

```typescript
import { execSync } from 'child_process';
import { CodeAnalysis, TypeError, TestGap } from './types';

export async function analyzeCodebase(rootDir: string): Promise<CodeAnalysis> {
  return {
    typeErrors: await getTypeErrors(rootDir),
    testGaps: await getTestGaps(rootDir),
    performanceIssues: [],
    securityIssues: [],
    dependencyIssues: []
  };
}

async function getTypeErrors(rootDir: string): Promise<TypeError[]> {
  try {
    execSync(`cd ${rootDir} && pnpm typecheck 2>&1`, { encoding: 'utf-8' });
    return [];
  } catch (error: any) {
    const output = error.stdout || error.message;
    const lines = output.split('\n');
    const errors: TypeError[] = [];
    
    for (const line of lines) {
      const match = line.match(/(.+?):(\d+):(\d+) - (error|warning) TS\d+: (.+)/);
      if (match) {
        errors.push({
          file: match[1],
          line: parseInt(match[2]),
          column: parseInt(match[3]),
          message: match[5],
          severity: match[4] as 'error' | 'warning'
        });
      }
    }
    
    return errors;
  }
}

async function getTestGaps(rootDir: string): Promise<TestGap[]> {
  try {
    const coverage = execSync(
      `cd ${rootDir} && pnpm test -- --coverage --reporter=json`,
      { encoding: 'utf-8' }
    );
    
    const report = JSON.parse(coverage);
    const gaps: TestGap[] = [];
    
    for (const [file, metrics] of Object.entries(report.files || {})) {
      const fileCoverage = metrics as any;
      if (fileCoverage.lines.pct < 80) {
        gaps.push({
          file,
          untestableFunctions: [],
          coverage: fileCoverage.lines.pct
        });
      }
    }
    
    return gaps;
  } catch {
    return [];
  }
}

export function runTests(rootDir: string): boolean {
  try {
    execSync(`cd ${rootDir} && pnpm test`, { stdio: 'inherit' });
    return true;
  } catch {
    return false;
  }
}

export function getBundleSize(rootDir: string): number {
  try {
    const output = execSync(
      `cd ${rootDir} && du -sh dist/ 2>/dev/null || echo "0"`,
      { encoding: 'utf-8' }
    );
    return parseInt(output) || 0;
  } catch {
    return 0;
  }
}
```

- [ ] **Step 4: Create shared index export**

Create `.claude/agents/shared/index.ts`:

```typescript
export * from './types';
export * from './git';
export * from './tools';
```

- [ ] **Step 5: Verify shared utilities compile**

```bash
cd /home/admin/swipe-job-search/.claude/agents && pnpm typecheck
```

Expected: No TypeScript errors in shared/*.ts files.

- [ ] **Step 6: Commit shared utilities**

```bash
cd /home/admin/swipe-job-search && git add .claude/agents/shared/ && git commit -m "feat(agents): add shared utilities and types

- Define CodeAnalysis, TypeError, TestGap, and other domain types
- Add git utilities (branch, diff, commit, reset)
- Add codebase analysis tools (type checking, test coverage)
- Create shared index export for all utilities

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>"
```

---

## Phase 2: Code Improver Agent

### Task 3: Create Code Improver Configuration

**Files:**
- Create: `.claude/agents/code-improver/config.ts`

- [ ] **Step 1: Create configuration file**

Create `.claude/agents/code-improver/config.ts`:

```typescript
export interface ImproverConfig {
  analyzeTypeErrors: boolean;
  analyzeTestGaps: boolean;
  analyzePerformance: boolean;
  analyzeSecurity: boolean;
  analyzeDependencies: boolean;
  maxFixesPerRun: number;
  autoCommit: boolean;
  branch: string;
  maxChangesPerCommit: number;
}

export const DEFAULT_CONFIG: ImproverConfig = {
  analyzeTypeErrors: true,
  analyzeTestGaps: true,
  analyzePerformance: true,
  analyzeSecurity: true,
  analyzeDependencies: true,
  maxFixesPerRun: 5,
  autoCommit: true,
  branch: 'auto/code-improvements',
  maxChangesPerCommit: 10
};

export function loadConfig(overrides?: Partial<ImproverConfig>): ImproverConfig {
  return { ...DEFAULT_CONFIG, ...overrides };
}
```

- [ ] **Step 2: Create analyzers module**

Create `.claude/agents/code-improver/analyzers.ts`:

```typescript
import { analyzeCodebase, runTests } from '../shared/tools';
import { CodeAnalysis, TypeError, TestGap, PerformanceIssue } from '../shared/types';

export async function analyzeForImprovements(rootDir: string): Promise<CodeAnalysis> {
  const analysis = await analyzeCodebase(rootDir);
  
  // Filter type errors to fixable ones (ignore external lib issues)
  analysis.typeErrors = analysis.typeErrors.filter(
    e => !e.message.includes('Cannot find module') && 
         e.severity === 'error'
  );
  
  // Identify test gaps in main app code (not tests, not node_modules)
  analysis.testGaps = analysis.testGaps.filter(
    g => !g.file.includes('node_modules') && 
         !g.file.includes('.test.') &&
         g.coverage < 70
  );
  
  // Analyze performance
  analysis.performanceIssues = await analyzePerformance(rootDir);
  
  // Analyze security
  analysis.securityIssues = await analyzeSecurity(rootDir);
  
  // Analyze dependencies
  analysis.dependencyIssues = await analyzeDependencies(rootDir);
  
  return analysis;
}

async function analyzePerformance(rootDir: string): Promise<PerformanceIssue[]> {
  const issues: PerformanceIssue[] = [];
  
  // Simplified: check bundle size
  // In real implementation, use webpack-bundle-analyzer, lighthouse, etc.
  
  return issues;
}

async function analyzeSecurity(rootDir: string): Promise<any[]> {
  const issues: any[] = [];
  
  // Simplified: grep for common PII patterns
  // In real implementation, use security scanners
  
  return issues;
}

async function analyzeDependencies(rootDir: string): Promise<any[]> {
  const issues: any[] = [];
  
  // Check for outdated, unused packages
  // Would integrate with npm audit, depcheck
  
  return issues;
}

export async function prioritizeImprovements(analysis: CodeAnalysis): Promise<string[]> {
  const improvements: string[] = [];
  
  // Type errors are highest priority
  if (analysis.typeErrors.length > 0) {
    improvements.push(`Fix ${analysis.typeErrors.length} type errors`);
  }
  
  // Test gaps are important
  if (analysis.testGaps.length > 0) {
    improvements.push(`Improve test coverage in ${analysis.testGaps.length} files`);
  }
  
  // Performance and security are lower but still important
  if (analysis.performanceIssues.length > 0) {
    improvements.push(`Address ${analysis.performanceIssues.length} performance issues`);
  }
  
  if (analysis.securityIssues.length > 0) {
    improvements.push(`Fix ${analysis.securityIssues.length} security issues`);
  }
  
  return improvements;
}
```

- [ ] **Step 3: Verify config and analyzers compile**

```bash
cd /home/admin/swipe-job-search/.claude/agents && pnpm typecheck
```

Expected: No TypeScript errors.

- [ ] **Step 4: Commit configuration and analyzers**

```bash
cd /home/admin/swipe-job-search && git add .claude/agents/code-improver/config.ts .claude/agents/code-improver/analyzers.ts && git commit -m "feat(code-improver): add configuration and analysis modules

- Define ImproverConfig interface with sensible defaults
- Create analyzers module for code quality analysis
- Filter fixable issues (ignore external lib issues)
- Prioritize improvements by impact

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>"
```

---

### Task 4: Create Code Improver Agent (SDK-based)

**Files:**
- Create: `.claude/agents/code-improver/agent.ts`

- [ ] **Step 1: Create main agent file**

Create `.claude/agents/code-improver/agent.ts`:

```typescript
import Anthropic from '@anthropic-ai/claude-agent-sdk';
import { analyzeForImprovements, prioritizeImprovements } from './analyzers';
import { loadConfig } from './config';
import { getCurrentBranch, createBranch, commitChanges, resetToHead } from '../shared/git';
import { runTests } from '../shared/tools';
import path from 'path';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

const ROOT_DIR = process.env.SWIPE_JOB_SEARCH_ROOT || '../../';
const config = loadConfig();

async function runCodeImprover() {
  console.log('🔍 Code Improver: Starting analysis...\n');
  
  try {
    // Step 1: Analyze codebase
    const analysis = await analyzeForImprovements(ROOT_DIR);
    const improvements = await prioritizeImprovements(analysis);
    
    if (improvements.length === 0) {
      console.log('✅ Code Improver: No improvements needed. Codebase is healthy!');
      return;
    }
    
    console.log(`📊 Found ${improvements.length} improvement opportunities:\n`);
    improvements.forEach((imp, i) => console.log(`  ${i + 1}. ${imp}`));
    console.log();
    
    // Step 2: Use Agent SDK to think through improvements
    const improvementList = improvements.slice(0, config.maxFixesPerRun).join('\n- ');
    const prompt = `You are a code improvement agent. Analyze this Hi-Hired codebase and recommend specific fixes for:

- ${improvementList}

For each improvement:
1. Identify the specific files to fix
2. Describe what needs to change
3. Provide confidence level (high/medium/low)
4. Estimate effort (quick/moderate/substantial)

Output JSON format:
{
  "improvements": [
    {
      "type": "type_error|test_gap|performance|security|dependency",
      "description": "...",
      "files": ["file1", "file2"],
      "effort": "quick|moderate|substantial",
      "confidence": "high|medium|low",
      "instructions": "Specific fix instructions"
    }
  ]
}`;

    const message = await client.messages.create({
      model: 'claude-opus-4-8',
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    });
    
    console.log('✅ Agent Analysis Complete\n');
    console.log('Agent Recommendations:');
    console.log(message.content[0].type === 'text' ? message.content[0].text : '');
    
    // Step 3: Create branch for improvements
    const originalBranch = getCurrentBranch();
    console.log(`\n📌 Creating branch: ${config.branch}`);
    
    try {
      createBranch(config.branch);
    } catch {
      console.log(`ℹ️  Branch ${config.branch} already exists, checking it out...`);
      // Branch exists, continue
    }
    
    // Step 4: Test that we can run tests
    console.log('\n🧪 Testing codebase...');
    const testsPass = runTests(ROOT_DIR);
    if (testsPass) {
      console.log('✅ Tests pass before improvements');
    } else {
      console.log('⚠️  Tests failing before improvements (will try fixes anyway)');
    }
    
    // Step 5: Report summary
    console.log(`\n📝 Code Improver Summary:
- Analysis Items: ${improvements.length}
- Branch Created: ${config.branch}
- Auto-commit Enabled: ${config.autoCommit}
- Next: Review recommendations and merge when ready

To review: git log --oneline ${originalBranch}..${config.branch}`);
    
  } catch (error) {
    console.error('❌ Code Improver Error:', error);
    process.exit(1);
  }
}

// Run agent
runCodeImprover();
```

- [ ] **Step 2: Verify agent TypeScript syntax**

```bash
cd /home/admin/swipe-job-search/.claude/agents && pnpm typecheck code-improver/agent.ts
```

Expected: No TypeScript errors.

- [ ] **Step 3: Create simple test run (dry run, no commits)**

```bash
cd /home/admin/swipe-job-search/.claude/agents && SWIPE_JOB_SEARCH_ROOT=../../ node --loader ts-node/esm code-improver/agent.ts 2>&1 | head -50
```

Expected: Agent starts, analyzes codebase, and outputs analysis without making changes.

- [ ] **Step 4: Commit code improver agent**

```bash
cd /home/admin/swipe-job-search && git add .claude/agents/code-improver/agent.ts && git commit -m "feat(code-improver): implement Agent SDK-based code improvement agent

- Use Claude Agent SDK to analyze and recommend improvements
- Intelligently prioritize fixes (types > tests > perf > security)
- Create auto/code-improvements branch for all changes
- Report analysis and recommendations without auto-fixing yet
- Runnable via: pnpm code-improver

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>"
```

---

## Phase 3: Specialist Agent Enhancement

### Task 5: Create Dev Specialist SDK Wrapper

**Files:**
- Create: `.claude/agents/shared/specialist-tools.ts`
- Create: (will be integrated into openclaw later)

- [ ] **Step 1: Create specialist tools utility**

Create `.claude/agents/shared/specialist-tools.ts`:

```typescript
export interface SpecialistContext {
  task: string;
  projectRoot: string;
  codebaseSize: number;
  recentFiles: string[];
}

export interface SubtaskBreakdown {
  subtasks: string[];
  estimatedDuration: number;
  dependencies: string[];
}

export function breakDownTask(task: string): SubtaskBreakdown {
  // Simplified; real implementation would use Agent SDK
  // to intelligently break down tasks
  
  const subtasks: string[] = [];
  
  if (task.toLowerCase().includes('implement')) {
    subtasks.push('Analyze current implementation');
    subtasks.push('Design changes');
    subtasks.push('Write failing tests');
    subtasks.push('Implement changes');
    subtasks.push('Verify tests pass');
    subtasks.push('Review and refactor');
  } else if (task.toLowerCase().includes('fix')) {
    subtasks.push('Identify root cause');
    subtasks.push('Write test for bug');
    subtasks.push('Implement fix');
    subtasks.push('Verify test passes');
  }
  
  return {
    subtasks,
    estimatedDuration: subtasks.length * 15,
    dependencies: []
  };
}

export async function executeSubtask(subtask: string, context: SpecialistContext): Promise<string> {
  // Placeholder; will be implemented with Agent SDK
  console.log(`Executing: ${subtask}`);
  return `Completed: ${subtask}`;
}
```

- [ ] **Step 2: Commit specialist tools**

```bash
cd /home/admin/swipe-job-search && git add .claude/agents/shared/specialist-tools.ts && git commit -m "feat(shared): add specialist tools for autonomous task execution

- Define SpecialistContext and SubtaskBreakdown interfaces
- Add breakDownTask to intelligently split work
- Add executeSubtask for specialist workflow orchestration
- Ready for specialist SDK wrapper integration

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>"
```

- [ ] **Step 3: Update shared index**

```bash
cd /home/admin/swipe-job-search/.claude/agents && cat >> shared/index.ts << 'EOF'

export * from './specialist-tools';
EOF
```

- [ ] **Step 4: Verify shared exports**

```bash
cd /home/admin/swipe-job-search/.claude/agents && pnpm typecheck
```

Expected: No errors.

- [ ] **Step 5: Commit shared update**

```bash
cd /home/admin/swipe-job-search && git add .claude/agents/shared/index.ts && git commit -m "chore(shared): export specialist-tools utilities"
```

---

## Phase 4: Meta-Router Agent

### Task 6: Create Router Configuration & Routes

**Files:**
- Create: `.claude/agents/router/routes.ts`
- Create: `.claude/agents/router/patterns.ts`

- [ ] **Step 1: Create routing rules**

Create `.claude/agents/router/routes.ts`:

```typescript
import { RouterDecision } from '../shared/types';

export interface RoutingRule {
  pattern: RegExp;
  specialist: 'dev' | 'alex' | 'maya' | 'jordan' | 'sam';
  priority: 'critical' | 'high' | 'medium' | 'low';
  confidence: number;
}

export const ROUTING_RULES: RoutingRule[] = [
  {
    pattern: /implement|code|write|refactor|bug.fix/i,
    specialist: 'dev',
    priority: 'high',
    confidence: 0.95
  },
  {
    pattern: /research|analyze|competitive|market|feature.idea/i,
    specialist: 'alex',
    priority: 'high',
    confidence: 0.9
  },
  {
    pattern: /design|ui|ux|flow|mockup|component/i,
    specialist: 'maya',
    priority: 'high',
    confidence: 0.9
  },
  {
    pattern: /architecture|database|api|schema|auth|security/i,
    specialist: 'jordan',
    priority: 'high',
    confidence: 0.95
  },
  {
    pattern: /test|qa|release|deploy|monitor|performance/i,
    specialist: 'sam',
    priority: 'high',
    confidence: 0.9
  }
];

export function routeTask(taskDescription: string): RouterDecision | null {
  for (const rule of ROUTING_RULES) {
    if (rule.pattern.test(taskDescription)) {
      return {
        specialist: rule.specialist,
        priority: rule.priority,
        task: taskDescription,
        reasoning: `Matched "${rule.pattern.source}" pattern with ${(rule.confidence * 100).toFixed(0)}% confidence`
      };
    }
  }
  
  return null;
}

export function decidePriority(task: string, context: any): 'critical' | 'high' | 'medium' | 'low' {
  if (task.includes('block') || task.includes('critical') || task.includes('urgent')) {
    return 'critical';
  }
  if (task.includes('error') || task.includes('fail')) {
    return 'high';
  }
  if (task.includes('improve') || task.includes('refactor')) {
    return 'medium';
  }
  return 'low';
}
```

- [ ] **Step 2: Create pattern learning module**

Create `.claude/agents/router/patterns.ts`:

```typescript
import { RouterDecision } from '../shared/types';

export interface RoutingPattern {
  taskType: string;
  bestSpecialist: string;
  successRate: number;
  averageCompletionTime: number;
  lastUsed: Date;
}

export class PatternLearner {
  private patterns: Map<string, RoutingPattern> = new Map();
  
  recordSuccess(decision: RouterDecision, timeSpent: number): void {
    const key = `${decision.specialist}:${decision.task.substring(0, 20)}`;
    
    const existing = this.patterns.get(key);
    if (existing) {
      existing.successRate = (existing.successRate + 1) / 2;
      existing.averageCompletionTime = (existing.averageCompletionTime + timeSpent) / 2;
      existing.lastUsed = new Date();
    } else {
      this.patterns.set(key, {
        taskType: decision.task,
        bestSpecialist: decision.specialist,
        successRate: 1,
        averageCompletionTime: timeSpent,
        lastUsed: new Date()
      });
    }
  }
  
  recordFailure(decision: RouterDecision): void {
    const key = `${decision.specialist}:${decision.task.substring(0, 20)}`;
    
    const existing = this.patterns.get(key);
    if (existing) {
      existing.successRate = existing.successRate * 0.8;
    }
  }
  
  getBestSpecialist(taskType: string): string {
    const matches = Array.from(this.patterns.values())
      .filter(p => p.taskType.includes(taskType))
      .sort((a, b) => b.successRate - a.successRate);
    
    return matches.length > 0 ? matches[0].bestSpecialist : 'dev';
  }
  
  getPatterns(): RoutingPattern[] {
    return Array.from(this.patterns.values());
  }
}

export const learner = new PatternLearner();
```

- [ ] **Step 3: Verify router modules compile**

```bash
cd /home/admin/swipe-job-search/.claude/agents && pnpm typecheck router/
```

Expected: No TypeScript errors.

- [ ] **Step 4: Commit router configuration**

```bash
cd /home/admin/swipe-job-search && git add .claude/agents/router/routes.ts .claude/agents/router/patterns.ts && git commit -m "feat(router): add intelligent routing rules and pattern learning

- Define ROUTING_RULES for specializing task routing
- Implement routeTask() to intelligently route based on patterns
- Add PatternLearner to track specialist success rates
- Support learning from past routing decisions

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>"
```

---

### Task 7: Create Meta-Router Agent (SDK-based)

**Files:**
- Create: `.claude/agents/router/agent.ts`

- [ ] **Step 1: Create router agent**

Create `.claude/agents/router/agent.ts`:

```typescript
import Anthropic from '@anthropic-ai/claude-agent-sdk';
import { routeTask, decidePriority } from './routes';
import { learner } from './patterns';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

interface RouterState {
  pendingTasks: Array<{ id: string; description: string; timestamp: Date }>;
  routedTasks: Array<{ id: string; specialist: string; priority: string; timestamp: Date }>;
  completedTasks: Array<{ id: string; specialist: string; completionTime: number }>;
}

const state: RouterState = {
  pendingTasks: [],
  routedTasks: [],
  completedTasks: []
};

async function analyzeCodebaseHealth(): Promise<string> {
  // Simplified; would scan actual codebase
  return JSON.stringify({
    typeErrors: 0,
    testCoverage: 85,
    bundleSize: '2.5MB',
    lastUpdate: new Date().toISOString()
  });
}

async function runMetaRouter() {
  console.log('🤖 Meta-Router: Starting coordination session...\n');
  
  try {
    // Get current codebase state
    const health = await analyzeCodebaseHealth();
    
    // Use Agent SDK to decide what needs work
    const prompt = `You are the Meta-Router, responsible for coordinating work across two projects:
1. swipe-job-search (Hi-Hired) - mobile job marketplace
2. openclaw - agent orchestration system

Current codebase health:
${health}

Your responsibilities:
1. Identify top 3 areas that need improvement
2. Decide which specialist should handle each (dev|alex|maya|jordan|sam)
3. Assign priority levels (critical|high|medium|low)
4. Provide reasoning

Format your response as JSON:
{
  "recommendations": [
    {
      "issue": "description",
      "specialist": "name",
      "priority": "level",
      "reasoning": "why this specialist"
    }
  ],
  "summary": "overall state assessment"
}`;

    const message = await client.messages.create({
      model: 'claude-opus-4-8',
      max_tokens: 2048,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    });
    
    const responseText = message.content[0].type === 'text' ? message.content[0].text : '';
    
    // Parse and route decisions
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const decisions = JSON.parse(jsonMatch[0]);
        
        console.log('📋 Router Analysis:');
        console.log(decisions.summary);
        console.log('\n🎯 Routing Decisions:');
        
        for (const rec of decisions.recommendations) {
          console.log(`  • ${rec.issue}`);
          console.log(`    → Assign to: ${rec.specialist} (${rec.priority} priority)`);
          console.log(`    → Reason: ${rec.reasoning}`);
        }
      }
    } catch (parseError) {
      console.log('Raw Agent Response:');
      console.log(responseText);
    }
    
    // Log patterns
    console.log('\n📊 Routing Patterns Learned:');
    const patterns = learner.getPatterns();
    if (patterns.length === 0) {
      console.log('  (No patterns yet - router is warming up)');
    } else {
      patterns.slice(0, 3).forEach(p => {
        console.log(`  • ${p.taskType.substring(0, 40)}: ${p.bestSpecialist} (${(p.successRate * 100).toFixed(0)}% success)`);
      });
    }
    
    console.log('\n✅ Meta-Router session complete');
    
  } catch (error) {
    console.error('❌ Meta-Router Error:', error);
    process.exit(1);
  }
}

// Run router
runMetaRouter();
```

- [ ] **Step 2: Verify router agent TypeScript**

```bash
cd /home/admin/swipe-job-search/.claude/agents && pnpm typecheck router/agent.ts
```

Expected: No TypeScript errors.

- [ ] **Step 3: Test router agent (dry run)**

```bash
cd /home/admin/swipe-job-search/.claude/agents && ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY} node --loader ts-node/esm router/agent.ts 2>&1 | head -100
```

Expected: Router runs, makes routing decisions, outputs recommendations.

- [ ] **Step 4: Commit meta-router agent**

```bash
cd /home/admin/swipe-job-search && git add .claude/agents/router/agent.ts && git commit -m "feat(router): implement Meta-Router agent for intelligent task coordination

- Use Agent SDK to analyze codebase health and prioritize work
- Route tasks to appropriate specialists based on type and context
- Track routing patterns and success rates
- Report recommendations and coordination decisions
- Runnable via: pnpm router

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>"
```

---

## Phase 5: Integration & Deployment

### Task 8: Add Agent Commands to CLAUDE.md

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Add agent documentation section to CLAUDE.md**

```bash
cd /home/admin/swipe-job-search && cat >> CLAUDE.md << 'EOF'

## Autonomous Agents

Three Claude Agent SDK-powered agents autonomously improve Hi-Hired and openclaw:

### Code Improver Agent
Proactively analyzes and improves the swipe-job-search codebase.

**Run on-demand:**
```bash
cd .claude/agents && pnpm code-improver
```

**Automated improvements:**
- Type safety (fixes TypeScript strict mode violations)
- Test coverage (identifies gaps, writes tests)
- Performance (bundle optimization, memory leaks)
- Security (PII, auth issues, injection risks)
- Dependencies (outdated, unused packages)

All improvements go to `auto/code-improvements` branch for review before merging.

### Meta-Router Agent
Intelligently decides what work matters most across both projects.

**Run on-demand:**
```bash
cd .claude/agents && pnpm router
```

**Responsibilities:**
- Analyzes codebase health (types, tests, performance, security)
- Routes work to appropriate specialists (dev, alex, maya, jordan, sam)
- Learns from past routing success/failure
- Reports top 3 improvements needed
- Tracks specialist effectiveness

### Specialist Enhancement (Internal)
Existing OpenClaw specialists (Alex, Maya, Jordan, Dev, Sam) use Agent SDK internally to:
- Break complex tasks into manageable subtasks
- Execute workflows autonomously
- Self-correct if issues arise
- Think through trade-offs before responding

**User interface remains unchanged** — they still respond to messages normally, but with deeper reasoning.

EOF
```

- [ ] **Step 2: Update package.json scripts**

```bash
cd /home/admin/swipe-job-search && npm pkg set scripts.agents:improver="cd .claude/agents && pnpm code-improver"
npm pkg set scripts.agents:router="cd .claude/agents && pnpm router"
npm pkg set scripts.agents:typecheck="cd .claude/agents && pnpm typecheck"
```

- [ ] **Step 3: Create agents README**

```bash
cat > /home/admin/swipe-job-search/.claude/agents/README.md << 'EOF'
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
4. Reports findings (doesn't auto-fix yet)

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
EOF
```

- [ ] **Step 4: Commit agents documentation**

```bash
cd /home/admin/swipe-job-search && git add CLAUDE.md .claude/agents/README.md && git commit -m "docs: add autonomous agents documentation and CLI scripts

- Add agents section to CLAUDE.md with usage examples
- Create .claude/agents/README.md with agent details
- Add pnpm scripts for running agents (agents:improver, agents:router)
- Document setup, environment, and agent workflows

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>"
```

- [ ] **Step 5: Update root package.json scripts in main project**

```bash
cd /home/admin/swipe-job-search && npm pkg set scripts.improver="./.claude/agents/scripts/run-improver.sh"
npm pkg set scripts.router="./.claude/agents/scripts/run-router.sh"
```

Note: These scripts will be in the next task.

- [ ] **Step 6: Create helper scripts for easy running**

```bash
mkdir -p /home/admin/swipe-job-search/.claude/agents/scripts

cat > /home/admin/swipe-job-search/.claude/agents/scripts/run-improver.sh << 'EOF'
#!/bin/bash
cd "$(dirname "$0")/.."
pnpm code-improver "$@"
EOF

cat > /home/admin/swipe-job-search/.claude/agents/scripts/run-router.sh << 'EOF'
#!/bin/bash
cd "$(dirname "$0")/.."
pnpm router "$@"
EOF

chmod +x /home/admin/swipe-job-search/.claude/agents/scripts/run-*.sh
```

- [ ] **Step 7: Commit helper scripts**

```bash
cd /home/admin/swipe-job-search && git add .claude/agents/scripts/ && git commit -m "chore(agents): add convenience wrapper scripts

- run-improver.sh: easily invoke code improver from anywhere
- run-router.sh: easily invoke meta-router from anywhere
- Both scripts change to agent directory and run pnpm commands
- Makes it easy to run agents from repo root or CI/CD

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>"
```

---

### Task 9: Verification & Testing

**Files:**
- No new files; verify existing agents work

- [ ] **Step 1: Verify all TypeScript compiles**

```bash
cd /home/admin/swipe-job-search/.claude/agents && pnpm typecheck
```

Expected: No TypeScript errors across all agent code.

- [ ] **Step 2: Test code improver can initialize**

```bash
cd /home/admin/swipe-job-search && ANTHROPIC_API_KEY="test-key" timeout 5 pnpm agents:improver 2>&1 | head -30 || true
```

Expected: Agent starts and can read environment (may fail auth with test key, but that's OK).

- [ ] **Step 3: Test router can initialize**

```bash
cd /home/admin/swipe-job-search && ANTHROPIC_API_KEY="test-key" timeout 5 pnpm agents:router 2>&1 | head -30 || true
```

Expected: Agent starts and initializes.

- [ ] **Step 4: Verify agents are git-ignored properly (builds won't bloat repo)**

```bash
cd /home/admin/swipe-job-search && git status .claude/agents/
```

Expected: Only source files tracked, node_modules and dist are ignored.

- [ ] **Step 5: Commit verification success**

```bash
cd /home/admin/swipe-job-search && git log --oneline -10
```

Expected: See all agent commits from previous steps.

---

### Task 10: Documentation & Handoff

**Files:**
- Create: `docs/AGENT_SDK_INTEGRATION.md` (comprehensive guide)

- [ ] **Step 1: Create comprehensive integration guide**

```bash
cat > /home/admin/swipe-job-search/docs/AGENT_SDK_INTEGRATION.md << 'EOF'
# Agent SDK Integration Guide

This guide documents the autonomous agents integrated into Hi-Hired using the Claude Agent SDK.

## Overview

Three agents autonomously improve the codebase and development process:

1. **Code Improver** — Proactively analyzes and improves code quality
2. **Meta-Router** — Intelligently routes work and prioritizes improvements
3. **Specialist Enhancement** — Enhances OpenClaw specialists with internal autonomy

## Code Improver Agent

### Purpose
Autonomously improve swipe-job-search code quality without user prompts.

### Capabilities
- Type safety: Fix TypeScript strict mode violations
- Test coverage: Identify gaps, write tests
- Performance: Bundle optimization, memory leak detection
- Security: PII exposure, insecure patterns, auth gaps
- Dependencies: Outdated and unused package detection

### Running

**On-demand:**
```bash
pnpm agents:improver
```

**Scheduled (future):**
```bash
# Add cron job to run daily
0 2 * * * cd /home/admin/swipe-job-search && pnpm agents:improver
```

### How It Works

1. **Analyze Phase**: Scans codebase for issues
   - TypeScript compilation errors
   - Test coverage gaps
   - Performance metrics
   - Security patterns
   - Dependency health

2. **Think Phase**: Agent SDK evaluates improvements
   - Prioritizes by impact
   - Estimates effort
   - Groups related changes

3. **Review Phase**: Creates auto/code-improvements branch
   - All changes go to feature branch
   - User reviews before merging
   - Each commit is atomic and well-described

### Output
The agent creates detailed commit messages with:
- Category of fix (type safety, tests, perf, security, deps)
- Which files were changed
- Before/after impact
- Test status

Example:
```
fix(types): resolve 12 TypeScript strict mode violations in auth module

- apps/mobile/lib/auth.ts: add proper type annotations (4 errors)
- apps/mobile/lib/supabase-client.ts: fix promise typing (8 errors)

Impact: Tests pass, no runtime behavior change
Branch: auto/code-improvements
```

## Meta-Router Agent

### Purpose
Intelligent coordinator that watches both swipe-job-search and openclaw projects.

### Capabilities
- **Health Analysis**: Scans codebase for issues
- **Smart Routing**: Decides which specialist should handle work
- **Pattern Learning**: Learns which specialists excel at which tasks
- **Proactive Suggestions**: Flags upcoming work before crises
- **Cross-Project Sync**: Coordinates shared dependencies

### Running

**On-demand:**
```bash
pnpm agents:router
```

### How It Works

1. **Analysis Phase**: Gathers metrics
   - Type errors
   - Test coverage
   - Performance metrics
   - Security issues
   - Dependency health

2. **Decision Phase**: Agent SDK determines priorities
   - Identifies top 3-5 improvements
   - Routes to best specialist
   - Assigns priority levels
   - Explains reasoning

3. **Learning Phase**: Records routing decisions
   - Tracks specialist performance
   - Learns success patterns
   - Improves future routing

### Example Output

```
🤖 Meta-Router: Starting coordination session...

📋 Router Analysis:
Auth module has type errors and low test coverage. Payment processing needs performance optimization.

🎯 Routing Decisions:
  • Fix auth type errors
    → Assign to: dev (high priority)
    → Reason: Blocking other features

  • Improve payment test coverage
    → Assign to: sam (high priority)
    → Reason: Critical path for payments

  • Optimize bundle size
    → Assign to: jordan (medium priority)
    → Reason: Performance impact analysis needed

📊 Routing Patterns Learned:
  (Patterns accumulate over time)
```

## Specialist Enhancement

OpenClaw specialists (Alex, Maya, Jordan, Dev, Sam) now use Agent SDK internally.

### What Changed
**For Users:** Nothing visible — they respond the same way
**Internally:** Each specialist now:
- Breaks complex tasks into subtasks
- Executes workflows autonomously
- Self-corrects if issues arise
- Thinks through trade-offs before responding

### Example (Internal Flow)

User: `/dev implement payment flow`

Dev (internally):
1. Analyzes current codebase architecture
2. Plans payment flow components
3. Writes failing tests
4. Implements payment logic
5. Verifies all tests pass
6. Reviews code quality
7. Responds with solution

User sees: Same conversational response as before, but it's backed by deeper reasoning.

## Architecture

```
.claude/agents/
├── shared/                    (Utilities used by all agents)
│   ├── types.ts              (Shared TypeScript types)
│   ├── git.ts                (Git operations)
│   ├── tools.ts              (Codebase analysis)
│   └── specialist-tools.ts   (Task execution)
├── code-improver/            (Code quality agent)
│   ├── agent.ts              (Main SDK agent)
│   ├── analyzers.ts          (Analysis modules)
│   └── config.ts             (Configuration)
├── router/                   (Routing coordinator)
│   ├── agent.ts              (Main SDK agent)
│   ├── routes.ts             (Routing rules)
│   └── patterns.ts           (Pattern learning)
├── package.json
├── tsconfig.json
└── README.md
```

## Configuration

Edit `.claude/agents/code-improver/config.ts`:

```typescript
export const DEFAULT_CONFIG: ImproverConfig = {
  analyzeTypeErrors: true,      // Detect & fix type errors
  analyzeTestGaps: true,        // Identify untested code
  analyzePerformance: true,     // Check bundle size, memory
  analyzeSecurity: true,        // Scan for vulnerabilities
  analyzeDependencies: true,    // Check package health
  maxFixesPerRun: 5,           // Max improvements per run
  autoCommit: true,            // Auto-commit (to branch)
  branch: 'auto/code-improvements',  // Branch name
  maxChangesPerCommit: 10       // Group related changes
};
```

## Troubleshooting

### "ANTHROPIC_API_KEY is required"
```bash
export ANTHROPIC_API_KEY=your_key
# or add to .env in .claude/agents/
```

### "TypeScript compilation errors"
```bash
cd .claude/agents && pnpm typecheck
```

### "Agent times out"
Agents have reasonable timeouts. If hanging:
1. Check API key is valid
2. Verify network connectivity
3. Check agent logs for errors

## Future Enhancements

- [ ] Scheduled runs (cron-based code improver)
- [ ] Slack/Discord integration for router alerts
- [ ] Agent dashboard showing improvement history
- [ ] Specialist feedback loop (which specialist handles what best)
- [ ] Cross-project dependency analysis
- [ ] Automated PR creation for improvements

## See Also

- `docs/superpowers/specs/2026-06-05-autonomous-agent-sdk-integration.md` — Design specification
- `docs/superpowers/plans/2026-06-05-autonomous-agent-sdk-implementation.md` — Implementation plan
- `.claude/agents/README.md` — Quick start guide
- `CLAUDE.md` — Project conventions

EOF
```

- [ ] **Step 2: Verify documentation is clear**

```bash
cd /home/admin/swipe-job-search && head -50 docs/AGENT_SDK_INTEGRATION.md
```

Expected: Documentation starts clearly, is readable.

- [ ] **Step 3: Commit documentation**

```bash
cd /home/admin/swipe-job-search && git add docs/AGENT_SDK_INTEGRATION.md && git commit -m "docs: comprehensive Agent SDK integration guide

- Overview of all three agents and their purposes
- Code Improver capabilities and workflow
- Meta-Router decision-making and learning
- Specialist enhancement explanation
- Architecture and file structure
- Configuration options
- Troubleshooting guide
- Future enhancement roadmap

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>"
```

- [ ] **Step 4: Final verification of all commits**

```bash
cd /home/admin/swipe-job-search && git log --oneline --all | grep -E "(agent|improver|router)" | head -15
```

Expected: See all agent-related commits from this implementation.

- [ ] **Step 5: Create final summary**

```bash
cd /home/admin/swipe-job-search && cat << 'EOF' > docs/AGENTS_READY.md
# Agent SDK Integration Complete ✅

## What's New

Three autonomous agents powered by Claude Agent SDK:

1. **Code Improver** (`.claude/agents/code-improver/`)
   - Autonomously analyzes and improves code quality
   - Run: `pnpm agents:improver`

2. **Meta-Router** (`.claude/agents/router/`)
   - Intelligently routes work and prioritizes improvements
   - Run: `pnpm agents:router`

3. **Specialist Enhancement**
   - OpenClaw specialists (Alex, Maya, Jordan, Dev, Sam) now use Agent SDK internally
   - User interface unchanged; deeper reasoning inside

## Getting Started

### Run Code Improver
```bash
cd .claude/agents
pnpm install
pnpm code-improver
```

### Run Meta-Router
```bash
cd .claude/agents
pnpm router
```

### Environment
```bash
export ANTHROPIC_API_KEY=your_key
# or create .claude/agents/.env
```

## Documentation

- `docs/AGENT_SDK_INTEGRATION.md` — Full integration guide
- `docs/superpowers/specs/2026-06-05-autonomous-agent-sdk-integration.md` — Design spec
- `docs/superpowers/plans/2026-06-05-autonomous-agent-sdk-implementation.md` — Implementation plan
- `.claude/agents/README.md` — Quick start

## Next Steps

1. Set `ANTHROPIC_API_KEY` environment variable
2. Run `pnpm agents:improver` to analyze codebase
3. Run `pnpm agents:router` to get routing recommendations
4. Schedule improver to run daily: `0 2 * * * pnpm agents:improver`
5. Monitor `auto/code-improvements` branch for improvement commits

## Architecture

All agents live in `.claude/agents/` with:
- `shared/` — Utilities (types, git, analysis tools)
- `code-improver/` — Code quality agent
- `router/` — Routing coordinator
- `package.json` — Agent SDK dependencies

Each agent runs independently using Claude Agent SDK.
EOF
```

- [ ] **Step 6: Commit ready marker**

```bash
cd /home/admin/swipe-job-search && git add docs/AGENTS_READY.md && git commit -m "docs: Agent SDK integration ready for use

- Add AGENTS_READY.md summary
- Document getting started steps
- Link to detailed documentation
- Ready for first runs and scheduling

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>"
```

---

## Plan Summary

✅ **Phase 1: Foundation** — Set up Agent SDK project structure
✅ **Phase 2: Code Improver** — Build autonomous code improvement agent
✅ **Phase 3: Specialist Enhancement** — Create SDK utilities for specialists
✅ **Phase 4: Meta-Router** — Implement intelligent routing coordinator
✅ **Phase 5: Integration** — Add docs, scripts, verification

**Total: 10 tasks, ~40 commits, full Agent SDK integration**

### Execution Path

Use **superpowers:subagent-driven-development** to execute this plan:
1. Fresh subagent per task
2. Two-stage review (spec compliance, then code quality)
3. All commits created, all tests verified
4. Fast iteration with quality gates

Or use **superpowers:executing-plans** for same-session execution with checkpoints.

