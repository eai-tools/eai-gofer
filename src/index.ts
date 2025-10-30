#!/usr/bin/env node

import { AutonomousOrchestrator } from './orchestrator/AutonomousOrchestrator_new.js';
import dotenv from 'dotenv';

dotenv.config();

async function main(): Promise<void> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    process.stderr.write('❌ ANTHROPIC_API_KEY not set in environment\n');
    process.exit(1);
  }

  const specDir = process.env.SPEC_DIR || '.specify/specs';
  const workspaceDir = process.env.WORKSPACE_DIR || process.cwd();

  const whatsappConfig = {
    enabled: process.env.WHATSAPP_ENABLED === 'true',
    phoneNumber: process.env.WHATSAPP_PHONE_NUMBER || '', // Format: 1234567890@c.us
  };

  // Determine notification method
  let notificationStatus = '📱 Notifications: Disabled';
  if (whatsappConfig.enabled && whatsappConfig.phoneNumber) {
    notificationStatus = '💬 Notifications: WhatsApp (scan QR on first run)';
  }

  process.stdout.write(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║         🚀 SpecGofer Autonomous Mode 🚀                   ║
║         Spec-Driven Development on Autopilot              ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝

📁 Spec directory: ${specDir}
📁 Workspace: ${workspaceDir}
🤖 Using Claude 3.7 Sonnet
${notificationStatus}
`);

  const orchestrator = new AutonomousOrchestrator(specDir);

  // Handle graceful shutdown
  let isShuttingDown = false;

  const shutdown = (): void => {
    if (isShuttingDown) {
      return;
    }
    isShuttingDown = true;

    process.stderr.write('\n\n🛑 Received shutdown signal...\n');
    orchestrator.stop();

    setTimeout(() => {
      process.stderr.write('👋 Goodbye!\n');
      process.exit(0);
    }, 2000);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  // Start the autonomous execution
  process.stdout.write('\n🚀 Starting autonomous orchestrator...\n\n');
  await orchestrator.start();
}

main().catch((error) => {
  process.stderr.write(`❌ Fatal error: ${error}\n`);
  process.exit(1);
});
