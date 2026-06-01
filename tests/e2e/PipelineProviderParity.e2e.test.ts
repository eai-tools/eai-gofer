/**
 * Pipeline Provider Parity E2E Tests
 *
 * Tests that Claude CLI and Codex CLI produce comparable outputs
 * when running the same pipeline stages.
 *
 * IMPORTANT: These tests require actual CLI installations:
 * - Claude Code CLI: npm install -g @anthropic/claude-code
 * - Codex CLI: npm install -g @openai/codex-cli
 *
 * Set CLI_E2E_TESTS=1 environment variable to enable these tests.
 * They are skipped by default to avoid requiring CLI installations in CI.
 */

import { describe, it, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

// Only run these tests if explicitly enabled
const E2E_ENABLED = process.env.CLI_E2E_TESTS === '1';

describe.skipIf(!E2E_ENABLED)('Pipeline Provider Parity E2E Tests', () => {
  let testWorkspace: string;

  beforeEach(async () => {
    // Create temporary test workspace
    testWorkspace = await fs.mkdtemp(path.join(os.tmpdir(), 'gofer-e2e-test-'));

    // Initialize test workspace with minimal project structure
    await fs.mkdir(path.join(testWorkspace, '.specify'), { recursive: true });
    await fs.mkdir(path.join(testWorkspace, '.specify/specs'), { recursive: true });
  });

  afterEach(async () => {
    // Cleanup test workspace
    try {
      await fs.rm(testWorkspace, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('Research Stage Parity', () => {
    it.todo('should produce similar research outputs with both CLIs', async () => {
      // This test would:
      // 1. Configure Claude CLI via settings
      // 2. Run /1_gofer_research with a simple feature
      // 3. Capture research.md output
      // 4. Parse structure (sections, headings, code blocks)
      // 5. Switch to Codex CLI via settings
      // 6. Run /1_gofer_research with same feature
      // 7. Capture research.md output
      // 8. Compare structures (not exact content, as LLMs vary)
      // 9. Verify both have similar sections and formatting
      // Example structure comparison:
      // - Both should have "## Codebase Analysis" section
      // - Both should have "## Technology Context" section
      // - Both should have code blocks
      // - Heading count should be within 20% of each other
      // Implementation requires:
      // - VSCode command execution via vscode.commands.executeCommand
      // - File system operations to read generated files
      // - Structure parsing utilities
      // - Timeout handling (research can take minutes)
    });
  });

  describe('Specification Stage Parity', () => {
    it.todo('should produce similar specifications with both CLIs', async () => {
      // This test would verify /2_gofer_specify produces similar:
      // - User stories structure
      // - Acceptance criteria format
      // - Technical requirements sections
      // - Markdown formatting consistency
    });
  });

  describe('Autonomous Mode Parity', () => {
    it.todo('should handle autonomous mode with both CLIs', async () => {
      // This test would verify autonomous mode works with both providers:
      // 1. Configure Claude CLI
      // 2. Run simple autonomous task (e.g., "create a function that adds two numbers")
      // 3. Verify task completes successfully
      // 4. Switch to Codex CLI
      // 5. Run same autonomous task
      // 6. Verify task completes successfully
      // 7. Compare results (both should create working functions)
    });
  });

  describe('Validation Agent Parity', () => {
    it.todo('should produce consistent validation scores with both CLIs', async () => {
      // This test would verify /6_gofer_validate produces similar scores:
      // 1. Run validation with Claude CLI on a test feature
      // 2. Capture validation score and findings
      // 3. Switch to Codex CLI
      // 4. Run validation on same test feature
      // 5. Capture validation score and findings
      // 6. Verify scores are within acceptable range (e.g., ±10 points)
      // 7. Verify both identify similar critical issues
    });
  });

  describe('Provider Switching Mid-Pipeline', () => {
    it.todo('should handle provider switch during multi-stage pipeline', async () => {
      // This test would verify:
      // 1. Start pipeline with Claude CLI
      // 2. Complete research stage
      // 3. Switch to Codex CLI mid-pipeline
      // 4. Continue with specification stage
      // 5. Verify pipeline completes successfully
      // 6. Verify outputs are coherent despite provider switch
      // 7. Verify conversation history maintained across switch
    });
  });
});

/**
 * Helper function to parse markdown structure
 * Extracts sections, headings, code blocks for comparison
 */
function parseMarkdownStructure(markdown: string): {
  sections: string[];
  headingCount: number;
  hasCodeBlocks: boolean;
  wordCount: number;
} {
  const sections = markdown.match(/^## .+$/gm) || [];
  const headingCount = (markdown.match(/^#{1,6} /gm) || []).length;
  const hasCodeBlocks = markdown.includes('```');
  const wordCount = markdown.split(/\s+/).length;

  return {
    sections: sections.map((s) => s.replace(/^## /, '')),
    headingCount,
    hasCodeBlocks,
    wordCount,
  };
}

/**
 * Helper function to compare markdown structures
 * Returns true if structures are similar (within thresholds)
 */
function areStructuresSimilar(
  structure1: ReturnType<typeof parseMarkdownStructure>,
  structure2: ReturnType<typeof parseMarkdownStructure>,
  options = {
    headingTolerance: 0.2, // 20% difference allowed
    wordCountTolerance: 0.3, // 30% difference allowed
  }
): { similar: boolean; reasons: string[] } {
  const reasons: string[] = [];

  // Check heading count similarity
  const headingDiff = Math.abs(structure1.headingCount - structure2.headingCount);
  const headingAvg = (structure1.headingCount + structure2.headingCount) / 2;
  if (headingDiff / headingAvg > options.headingTolerance) {
    reasons.push(
      `Heading count differs significantly: ${structure1.headingCount} vs ${structure2.headingCount}`
    );
  }

  // Check word count similarity
  const wordDiff = Math.abs(structure1.wordCount - structure2.wordCount);
  const wordAvg = (structure1.wordCount + structure2.wordCount) / 2;
  if (wordDiff / wordAvg > options.wordCountTolerance) {
    reasons.push(
      `Word count differs significantly: ${structure1.wordCount} vs ${structure2.wordCount}`
    );
  }

  // Check code block presence
  if (structure1.hasCodeBlocks !== structure2.hasCodeBlocks) {
    reasons.push(
      `Code block presence differs: ${structure1.hasCodeBlocks} vs ${structure2.hasCodeBlocks}`
    );
  }

  // Check section overlap (at least 50% common sections)
  const commonSections = structure1.sections.filter((s) =>
    structure2.sections.some(
      (s2) =>
        s2.toLowerCase().includes(s.toLowerCase()) || s.toLowerCase().includes(s2.toLowerCase())
    )
  );
  const sectionOverlap =
    commonSections.length / Math.max(structure1.sections.length, structure2.sections.length);
  if (sectionOverlap < 0.5) {
    reasons.push(`Section overlap too low: ${(sectionOverlap * 100).toFixed(0)}% (expected >50%)`);
  }

  return {
    similar: reasons.length === 0,
    reasons,
  };
}

/**
 * Helper function to wait for file to exist
 */
async function waitForFileExists(filePath: string, timeoutMs = 30000): Promise<boolean> {
  const startTime = Date.now();
  while (Date.now() - startTime < timeoutMs) {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }
  return false;
}

// Export helpers for use in other E2E tests
export { parseMarkdownStructure, areStructuresSimilar, waitForFileExists };
