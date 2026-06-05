import { execSync } from 'child_process';
import { CodeAnalysis, TypeError, TestGap } from './types.js';

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
