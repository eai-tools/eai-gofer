#!/usr/bin/env tsx
/**
 * Command Generator for Cross-Platform Parity
 *
 * Generates Codex CLI skills and Copilot Chat prompts from Claude CLI reference implementation.
 * Codex skills live directly in .agents/skills; no extra mirror step is required.
 * This ensures Gofer command flow stays aligned across Claude, Copilot VSCode, Copilot CLI,
 * Codex CLI, and Gemini CLI.
 *
 * Usage:
 *   npm run generate-commands               # Generate all commands
 *   npm run generate-commands -- --platform codex   # Generate only Codex skills
 *   npm run generate-commands -- --platform copilot # Generate only Copilot prompts
 *   npm run generate-commands -- --dry-run  # Preview changes without writing files
 *
 * Feature: 028-cross-platform-command-parity
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

/**
 * CLI arguments
 */
interface GenerateCommandsArgs {
  platform?: 'codex' | 'copilot' | 'all';
  workflowProfile: 'standard' | 'enterpriseai' | 'auto';
  dryRun: boolean;
  verbose: boolean;
}

/**
 * Parse command-line arguments
 */
function parseArgs(): GenerateCommandsArgs {
  const args = process.argv.slice(2);
  const result: GenerateCommandsArgs = {
    workflowProfile: 'auto',
    dryRun: false,
    verbose: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case '--platform':
        result.platform = args[++i] as 'codex' | 'copilot' | 'all';
        break;
      case '--dry-run':
        result.dryRun = true;
        break;
      case '--workflow-profile':
      case '--profile':
        result.workflowProfile = args[++i] as 'standard' | 'enterpriseai' | 'auto';
        break;
      case '--verbose':
      case '-v':
        result.verbose = true;
        break;
      case '--help':
      case '-h':
        printUsage();
        process.exit(0);
    }
  }

  if (!['standard', 'enterpriseai', 'auto'].includes(result.workflowProfile)) {
    throw new Error(
      `Invalid --workflow-profile value "${result.workflowProfile}". Use standard, enterpriseai, or auto.`
    );
  }

  return result;
}

/**
 * Print usage information
 */
function printUsage(): void {
  console.log(`
Usage: npm run generate-commands [options]

Options:
  --platform <type>   Generate for specific platform: codex, copilot, or all (default: all)
  --workflow-profile  Metadata workflow profile: standard, enterpriseai, or auto (default: auto)
  --dry-run          Preview changes without writing files
  --verbose, -v      Show detailed generation output
  --help, -h         Show this help message

Examples:
  npm run generate-commands                        # Generate all commands
  npm run generate-commands -- --platform codex    # Generate only Codex skills
  npm run generate-commands -- --workflow-profile enterpriseai
  npm run generate-commands -- --dry-run           # Preview without writing
  `);
}

/**
 * Main generation logic
 */
async function main(): Promise<void> {
  const args = parseArgs();
  const workflowProfileOverride =
    args.workflowProfile === 'auto' ? undefined : args.workflowProfile;

  // Determine which platforms to generate
  const platforms: Array<'codex' | 'copilot'> = [];
  if (args.platform === 'codex' || args.platform === 'all' || !args.platform) {
    platforms.push('codex');
  }
  if (args.platform === 'copilot' || args.platform === 'all' || !args.platform) {
    platforms.push('copilot');
  }


  // Get workspace path (parent of scripts directory)
  const scriptPath = fileURLToPath(import.meta.url);
  const scriptDir = path.dirname(scriptPath);
  const workspacePath = path.resolve(scriptDir, '..');

  // Import CommandGenerator (dynamically to avoid compilation issues)
  const { CommandGenerator } = await import(
    '../extension/src/council/CommandGenerator.ts'
  );

  const generator = new CommandGenerator(workspacePath);
  if (args.verbose) {
    console.log(
      `Using workflow profile metadata: ${workflowProfileOverride ?? 'auto-detected per canonical source'}`
    );
  }
  for (const platform of platforms) {

    try {
      const generatedPaths = await generator.generateCommands(
        platform,
        args.dryRun,
        {
          workflowProfileOverride,
          metadataSource: 'scripts/generate-commands.ts',
        }
      );

      if (args.verbose) {
        console.log(`Generated ${generatedPaths.length} ${platform} command files`);
      }
    } catch (error) {
      console.error(`❌ Failed to generate ${platform} commands:`, error);
      process.exit(1);
    }
  }

}

// Run if invoked directly
const scriptPath = fileURLToPath(import.meta.url);
const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : '';

if (invokedPath === scriptPath) {
  main().catch((error) => {
    console.error('❌ Generation failed:', error.message);
    process.exit(1);
  });
}

export { GenerateCommandsArgs };
