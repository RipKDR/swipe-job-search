import { RouterDecision } from '../shared/types.js';

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
