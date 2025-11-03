#!/usr/bin/env node

/**
 * Manual Test - Shows how SpecGofer should work with direct Claude API calls
 * Run this to see the autonomous mode in action without file-watching
 */

import Anthropic from '@anthropic-ai/sdk';
import dotenv from 'dotenv';
import { promises as fs } from 'fs';
import path from 'path';

dotenv.config();

const apiKey = process.env.ANTHROPIC_API_KEY;
if (!apiKey) {
  console.error('❌ ANTHROPIC_API_KEY not set');
  process.exit(1);
}

const anthropic = new Anthropic({ apiKey });
const workspaceDir = process.cwd();

console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║         🤖 SpecGofer Direct API Test 🤖                   ║
║         Shows Claude API Integration                      ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝

📁 Workspace: ${workspaceDir}
🤖 Using Claude 3.7 Sonnet
`);

// Example task from .claude-input.txt
const task = {
  id: 'task-001',
  description: 'Create login UI component with email and password fields',
  deliveryPrompt: 'Create a login UI component with email and password input fields, a submit button, and proper form validation. Style it according to our design system.'
};

async function implementTask() {
  console.log(`\n🎯 Processing Task: ${task.id}`);
  console.log(`📝 Description: ${task.description}\n`);

  // Load constitution
  console.log('📖 Loading constitution...');
  let constitution = '';
  try {
    const constitutionPath = path.join(workspaceDir, '.specify', 'memory', 'constitution.md');
    constitution = await fs.readFile(constitutionPath, 'utf-8');
    console.log(`   ✓ Constitution loaded (${constitution.length} chars)\n`);
  } catch {
    console.log('   ℹ️  No constitution found\n');
  }

  // Build prompt
  const prompt = `You are a senior software engineer implementing a task for the SpecGofer project.

# Task: ${task.id}
**Description**: ${task.description}
**Delivery Prompt**: ${task.deliveryPrompt}

${constitution ? `## Project Constitution\n\n${constitution.substring(0, 1500)}...\n` : ''}

## Instructions

Please implement this task following these guidelines:

1. **Analyze** what needs to be created/modified
2. **Write clean, maintainable code** following best practices
3. **Include proper error handling**
4. **Add helpful comments**

Provide your implementation in this format:

\`\`\`
FILE: path/to/file.tsx
---
[file contents here]
---

SUMMARY:
[Brief explanation of what you implemented and where files should be created]
\`\`\`

Begin your implementation now.`;

  console.log('🤖 Calling Claude API...');
  console.log(`   → Prompt length: ${prompt.length} chars`);
  console.log('   → Model: claude-3-7-sonnet-20250219');
  console.log('   → Max tokens: 8000\n');

  const startTime = Date.now();

  try {
    const response = await anthropic.messages.create({
      model: 'claude-3-7-sonnet-20250219',
      max_tokens: 8000,
      temperature: 0.7,
      messages: [{
        role: 'user',
        content: prompt
      }]
    });

    const elapsed = Date.now() - startTime;
    console.log(`✅ Received response from Claude (${elapsed}ms)\n`);

    if (response.content && response.content.length > 0) {
      const textContent = response.content[0];
      if ('text' in textContent) {
        const responseText = textContent.text;
        console.log('📄 Response Preview:');
        console.log('─'.repeat(70));
        console.log(responseText.substring(0, 1000));
        console.log('─'.repeat(70));
        console.log(`\n📊 Full response length: ${responseText.length} chars`);
        console.log(`📊 Usage: ${response.usage.input_tokens} input, ${response.usage.output_tokens} output tokens`);
        
        // Save to output file
        const outputPath = path.join(workspaceDir, '.claude-output.txt');
        await fs.writeFile(outputPath, responseText, 'utf-8');
        console.log(`\n💾 Saved response to: ${outputPath}`);
        
        return responseText;
      }
    }

    console.log('⚠️  No text content in response');
    return null;

  } catch (error) {
    console.error('\n❌ Error calling Claude API:', error);
    return null;
  }
}

// Run the test
implementTask()
  .then((result) => {
    if (result) {
      console.log('\n✅ Test completed successfully!');
      console.log('\n💡 This shows how SpecGofer should work:');
      console.log('   1. Load task from spec');
      console.log('   2. Build comprehensive prompt with constitution');
      console.log('   3. Call Claude API directly (no file watching!)');
      console.log('   4. Receive implementation immediately');
      console.log('   5. Validate and test the code');
      console.log('   6. Move to next task');
    } else {
      console.log('\n❌ Test failed');
      process.exit(1);
    }
  })
  .catch((error) => {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  });
