import Anthropic from '@anthropic-ai/claude-agent-sdk';
import { routeTask, decidePriority } from './routes.js';
import { learner } from './patterns.js';

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
