#!/usr/bin/env node

import { AutonomousOrchestrator } from './orchestrator/AutonomousOrchestrator_new.js';
import dotenv from 'dotenv';
import * as path from 'path';

dotenv.config();

async function main(): Promise<void> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    process.stderr.write('❌ ANTHROPIC_API_KEY not set in environment\n');
    process.exit(1);
  }

  const specDir = process.env.SPEC_DIR || path.join(process.cwd(), '.specify');
  const workspaceDir = process.env.WORKSPACE_DIR || process.cwd();

  const whatsappConfig = {
    enabled: process.env.WHATSAPP_ENABLED === 'true',
    phoneNumber: process.env.WHATSAPP_PHONE_NUMBER || '', // Format: 1234567890@c.us
    sessionPath: '.wwebjs_auth',
  };

  // Determine notification method
  let notificationStatus = '📱 Notifications: Disabled';
  if (whatsappConfig.enabled && whatsappConfig.phoneNumber) {
    notificationStatus = '💬 Notifications: WhatsApp (scan QR on first run)';
  }

  process.stdout.write(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║         🚀 Gofer Autonomous Mode 🚀                   ║
║         Spec-Driven Development on Autopilot              ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝

📁 Spec directory: ${specDir}
📁 Workspace: ${workspaceDir}
🤖 Using Claude 3.7 Sonnet (Direct API)
${notificationStatus}
`);

  const orchestrator = new AutonomousOrchestrator(specDir);
  await orchestrator.start();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
