#!/usr/bin/env tsx
/**
 * Command Generator for Cross-Platform Parity
 *
 * Generates Codex CLI skills and Copilot Chat prompts from Claude CLI reference implementation,
 * then mirrors Codex skills into .agents/skills for Gemini CLI and Copilot CLI compatibility.
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

interface NonDestructiveSyncStats {
  copied: number;
  updated: number;
  unchanged: number;
}

function normalizePathForOutput(filePath: string): string {
  return filePath.replace(/\\/g, '/');
}

function syncDirectoryNonDestructive(
  sourcePath: string,
  targetPath: string,
  dryRun: boolean,
  verbose: boolean,
  stats: NonDestructiveSyncStats
): void {
  const entries = fs.readdirSync(sourcePath, { withFileTypes: true });

  for (const entry of entries) {
    const sourceEntry = path.join(sourcePath, entry.name);
    const targetEntry = path.join(targetPath, entry.name);

    if (entry.isDirectory()) {
      if (!dryRun) {
        fs.mkdirSync(targetEntry, { recursive: true });
      }
      syncDirectoryNonDestructive(sourceEntry, targetEntry, dryRun, verbose, stats);
      continue;
    }

    const targetExists = fs.existsSync(targetEntry);
    const sourceContent = fs.readFileSync(sourceEntry, 'utf8');
    const targetContent = targetExists ? fs.readFileSync(targetEntry, 'utf8') : null;

    if (targetExists && targetContent === sourceContent) {
      stats.unchanged++;
      continue;
    }

    if (targetExists) {
      stats.updated++;
    } else {
      stats.copied++;
    }

    if (!dryRun) {
      fs.mkdirSync(path.dirname(targetEntry), { recursive: true });
      fs.writeFileSync(targetEntry, sourceContent, 'utf8');
    }

    if (verbose) {
      const operation = targetExists ? 'updated' : 'copied';
      console.log(
        `${dryRun ? '[dry-run] ' : ''}${operation} ${normalizePathForOutput(targetEntry)}`
      );
    }
  }
}

/**
 * Mirror generated Codex skills to .agents/skills for Copilot CLI and Gemini CLI.
 */
function syncCodexSkillsToAgents(
  workspacePath: string,
  dryRun: boolean,
  verbose: boolean
): void {
  const codexSkillsDir = path.join(workspacePath, '.system', 'skills');
  const agentsSkillsDir = path.join(workspacePath, '.agents', 'skills');

  if (!fs.existsSync(codexSkillsDir)) {
    throw new Error(`Codex skills directory not found: ${codexSkillsDir}`);
  }

  if (dryRun) {
    if (verbose) {
      console.log(
        `[dry-run] Would non-destructively sync ${normalizePathForOutput(path.relative(workspacePath, codexSkillsDir))} -> ${normalizePathForOutput(path.relative(workspacePath, agentsSkillsDir))}`
      );
    }
  } else {
    fs.mkdirSync(agentsSkillsDir, { recursive: true });
  }

  const stats: NonDestructiveSyncStats = {
    copied: 0,
    updated: 0,
    unchanged: 0,
  };
  syncDirectoryNonDestructive(codexSkillsDir, agentsSkillsDir, dryRun, verbose, stats);

  if (verbose) {
    console.log(
      `Synced Codex skills to ${normalizePathForOutput(path.relative(workspacePath, agentsSkillsDir))} (copied=${stats.copied}, updated=${stats.updated}, unchanged=${stats.unchanged})`
    );
  }
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

      if (platform === 'codex') {
        syncCodexSkillsToAgents(workspacePath, args.dryRun, args.verbose);
      }

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
