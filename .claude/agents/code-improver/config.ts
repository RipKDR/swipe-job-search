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
