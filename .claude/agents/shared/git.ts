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
