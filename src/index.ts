#!/usr/bin/env node

import { AutonomousOrchestrator } from './orchestrator/AutonomousOrchestrator.js';
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

  const specDir = process.env.SPEC_DIR || '.specify/specs';
  const workspaceDir = process.env.WORKSPACE_DIR || process.cwd();

  const whatsappConfig = {
    enabled: process.env.WHATSAPP_ENABLED === 'true',
    phoneNumber: process.env.WHATSAPP_PHONE_NUMBER || '' // Format: 1234567890@c.us
  };

  // Determine notification method
  let notificationStatus = '📱 Notifications: Disabled';
  if (whatsappConfig.enabled && whatsappConfig.phoneNumber) {
    notificationStatus = '💬 Notifications: WhatsApp (scan QR on first run)';
  }

  console.log(`
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

  const orchestrator = new AutonomousOrchestrator(
    specDir,
    apiKey,
    whatsappConfig,
    workspaceDir
  );

  // Handle graceful shutdown
  let isShuttingDown = false;
  
  const shutdown = () => {
    if (isShuttingDown) {return;}
    isShuttingDown = true;
    
    console.log('\n\n🛑 Received shutdown signal...');
    orchestrator.stop();
    
    setTimeout(() => {
      console.log('👋 Goodbye!');
      process.exit(0);
    }, 2000);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  // Status monitoring
  setInterval(() => {
    const status = orchestrator.getStatus();
    if (status.currentTask) {
      console.log(`\n� Status: ${status.currentTask.id} - ${status.currentTask.description.substring(0, 50)}...`);
    }
  }, 30000); // Log status every 30 seconds

  // Start the autonomous execution
  await orchestrator.start();
}

main().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
