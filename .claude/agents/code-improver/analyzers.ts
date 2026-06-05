import { analyzeCodebase, runTests } from '../shared/tools.js';
import { CodeAnalysis, TypeError, TestGap, PerformanceIssue } from '../shared/types.js';

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
