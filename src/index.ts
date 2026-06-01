#!/usr/bin/env node

import { AutonomousOrchestrator } from './orchestrator/AutonomousOrchestrator_new.js';
import dotenv from 'dotenv';
import * as path from 'path';

dotenv.config();

async function main(): Promise<void> {
  const specDir = process.env.SPEC_DIR || path.join(process.cwd(), '.specify', 'specs');
  const workspaceDir = process.env.WORKSPACE_DIR || process.cwd();

  const notificationStatus = 'Notifications: VS Code / CLI only';

  process.stdout.write(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║         🚀 Gofer Autonomous Mode 🚀                   ║
║         Spec-Driven Development on Autopilot              ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝

📁 Spec directory: ${specDir}
📁 Workspace: ${workspaceDir}
Provider: external CLI session / Gofer command surface
${notificationStatus}
`);

  const orchestrator = new AutonomousOrchestrator(specDir);
  await orchestrator.start();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
