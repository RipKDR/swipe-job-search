import { RouterDecision } from '../shared/types.js';

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
