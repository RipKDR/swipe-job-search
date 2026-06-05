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
