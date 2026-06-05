import Anthropic from '@anthropic-ai/claude-agent-sdk';
import { analyzeForImprovements, prioritizeImprovements } from './analyzers.js';
import { loadConfig } from './config.js';
import { getCurrentBranch, createBranch, commitChanges, resetToHead } from '../shared/git.js';
import { runTests } from '../shared/tools.js';
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
