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
  dryRun: boolean;
  verbose: boolean;
}

/**
 * Parse command-line arguments
 */
function parseArgs(): GenerateCommandsArgs {
  const args = process.argv.slice(2);
  const result: GenerateCommandsArgs = {
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
  --dry-run          Preview changes without writing files
  --verbose, -v      Show detailed generation output
  --help, -h         Show this help message

Examples:
  npm run generate-commands                        # Generate all commands
  npm run generate-commands -- --platform codex    # Generate only Codex skills
  npm run generate-commands -- --dry-run           # Preview without writing
  `);
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
        `[dry-run] Would sync ${path.relative(workspacePath, codexSkillsDir)} -> ${path.relative(workspacePath, agentsSkillsDir)}`
      );
    }
    return;
  }

  fs.rmSync(agentsSkillsDir, { recursive: true, force: true });
  fs.mkdirSync(path.dirname(agentsSkillsDir), { recursive: true });
  fs.cpSync(codexSkillsDir, agentsSkillsDir, { recursive: true });

  if (verbose) {
    console.log(`Synced Codex skills to ${path.relative(workspacePath, agentsSkillsDir)}`);
  }
}

/**
 * File system helpers
 */
class FileSystemHelpers {
  /**
   * Ensure directory exists, create if not
   */
  static ensureDirectory(dirPath: string): void {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  }

  /**
   * Read file with error handling
   */
  static readFile(filePath: string): string {
    try {
      return fs.readFileSync(filePath, 'utf8');
    } catch (error) {
      throw new Error(`Failed to read file ${filePath}: ${error}`);
    }
  }

  /**
   * Write file with error handling
   */
  static writeFile(filePath: string, content: string): void {
    try {
      fs.writeFileSync(filePath, content, 'utf8');
    } catch (error) {
      throw new Error(`Failed to write file ${filePath}: ${error}`);
    }
  }

  /**
   * List files in directory matching pattern
   */
  static listFiles(dirPath: string, pattern: RegExp): string[] {
    try {
      return fs.readdirSync(dirPath).filter((file) => pattern.test(file));
    } catch (error) {
      throw new Error(`Failed to list files in ${dirPath}: ${error}`);
    }
  }
}

/**
 * Main generation logic
 */
async function main(): Promise<void> {
  const args = parseArgs();

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
  for (const platform of platforms) {

    try {
      const generatedPaths = await generator.generateCommands(
        platform,
        args.dryRun
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

export { GenerateCommandsArgs, FileSystemHelpers };
