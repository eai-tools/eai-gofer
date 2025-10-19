#!/usr/bin/env node

import { Orchestrator } from './orchestrator/Orchestrator.js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function main() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('❌ ANTHROPIC_API_KEY not set in environment');
    process.exit(1);
  }

  const specDir = process.env.SPEC_DIR || '.specify';
  const workspaceDir = process.env.WORKSPACE_DIR || process.cwd();

  const twilioConfig = {
    accountSid: process.env.TWILIO_ACCOUNT_SID || '',
    authToken: process.env.TWILIO_AUTH_TOKEN || '',
    fromNumber: process.env.TWILIO_PHONE_NUMBER || '',
    toNumber: process.env.YOUR_PHONE_NUMBER || ''
  };

  console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   Spec-Driven Development Orchestrator                   ║
║   Powered by Claude Code                                  ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝

📁 Spec directory: ${specDir}
📁 Workspace: ${workspaceDir}
🤖 Using Claude Sonnet 4.5
${twilioConfig.accountSid ? '📱 SMS notifications: Enabled' : '📱 SMS notifications: Disabled (simulation mode)'}
`);

  const orchestrator = new Orchestrator(
    specDir,
    apiKey,
    twilioConfig,
    workspaceDir
  );

  // Handle command line arguments
  const args = process.argv.slice(2);

  if (args[0] === 'question' && args[1]) {
    // Manual question mode
    const question = args.slice(1).join(' ');
    await orchestrator.handleManualQuestion(question);
    process.exit(0);
  }

  // Start the orchestrator with file watching
  await orchestrator.start(workspaceDir);

  // Keep the process running
  process.on('SIGINT', () => {
    console.log('\n\n👋 Shutting down...');
    process.exit(0);
  });
}

main().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
