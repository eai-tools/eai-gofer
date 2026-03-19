#!/usr/bin/env ts-node
/**
 * Command Generator for Cross-Platform Parity
 *
 * Generates Codex CLI skills and enhances Copilot Chat prompts from Claude CLI reference implementation.
 * This ensures all 16 Gofer commands work identically across Claude, Copilot, and Codex platforms.
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

  console.log('🚀 Gofer Command Generator');
  console.log('Feature: 028-cross-platform-command-parity\n');

  if (args.dryRun) {
    console.log('⚠️  DRY RUN MODE: No files will be written\n');
  }

  // Determine which platforms to generate
  const platforms: Array<'codex' | 'copilot'> = [];
  if (args.platform === 'codex' || args.platform === 'all' || !args.platform) {
    platforms.push('codex');
  }
  if (args.platform === 'copilot' || args.platform === 'all' || !args.platform) {
    platforms.push('copilot');
  }

  console.log(`📋 Platforms: ${platforms.join(', ')}\n`);

  // Get workspace path (parent of scripts directory)
  const workspacePath = path.resolve(__dirname, '..');

  // Import CommandGenerator (dynamically to avoid compilation issues)
  const { CommandGenerator } = await import(
    '../extension/src/council/CommandGenerator'
  );

  const generator = new CommandGenerator(workspacePath);

  let totalGenerated = 0;

  for (const platform of platforms) {
    console.log(`\n🔨 Generating ${platform} commands...\n`);

    try {
      const generatedPaths = await generator.generateCommands(
        platform,
        args.dryRun
      );

      console.log(`✅ Generated ${generatedPaths.length} commands for ${platform}:\n`);

      generatedPaths.forEach((filePath) => {
        const relativePath = path.relative(workspacePath, filePath);
        console.log(`   - ${relativePath}`);
        if (args.verbose) {
          console.log(`     Full path: ${filePath}`);
        }
      });

      totalGenerated += generatedPaths.length;
    } catch (error) {
      console.error(`❌ Failed to generate ${platform} commands:`, error);
      process.exit(1);
    }
  }

  console.log(`\n✅ Generation complete! Total commands generated: ${totalGenerated}`);
}

// Run if invoked directly
if (require.main === module) {
  main().catch((error) => {
    console.error('❌ Generation failed:', error.message);
    process.exit(1);
  });
}

export { GenerateCommandsArgs, FileSystemHelpers };
