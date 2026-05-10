/**
 * ValidationPatternExtractor - Extract patterns from validation reports
 * Feature 029: Memory System v2 - US-P1-02
 *
 * T047: Class definition
 * T048: extractFromValidationReport() - Red → validation_pattern
 * T049: Yellow → lesson mapping
 * T050: parseValidationReport() for YAML + markdown
 */

import type { MemoryManager } from '../MemoryManager';
import type { Memory } from '../memory';
import { Logger } from '../../utils/logger';

// ============================================================================
// Types
// ============================================================================

/**
 * A pattern extracted from a validation report finding.
 */
export interface ExtractedPattern {
  severity: 'red' | 'yellow';
  category: string;
  description: string;
  affectedFiles: string[];
  agentId: string;
  featureId: string;
}

// ============================================================================
// ValidationPatternExtractor
// ============================================================================

/**
 * Extracts validation findings as persistent memories.
 *
 * Red findings → `validation_pattern` memories (blocks future validation)
 * Yellow findings → `lesson` memories (advisory patterns)
 *
 * @example
 * ```typescript
 * const extractor = new ValidationPatternExtractor(memoryManager);
 * const memories = await extractor.extractFromValidationReport(report, 'feature-029');
 * ```
 */
export class ValidationPatternExtractor {
  private readonly logger = Logger.for('ValidationPatternExtractor');

  constructor(private readonly memoryManager: MemoryManager) {}

  /**
   * T048: Extract patterns from a validation report and save as memories.
   *
   * @param reportContent - Raw report content (markdown or YAML)
   * @param featureId - Feature ID for provenance tracking
   * @returns Array of created memories (non-blocking: errors per pattern are caught)
   */
  async extractFromValidationReport(reportContent: string, featureId: string): Promise<Memory[]> {
    const patterns = this.parseValidationReport(reportContent);
    const created: Memory[] = [];

    for (const pattern of patterns) {
      try {
        const memory = await this.savePattern(pattern, featureId);
        created.push(memory);
      } catch (err) {
        this.logger.debug('Memory save failed (non-blocking)', err);
      }
    }

    return created;
  }

  /**
   * T050: Parse a validation report to extract Red and Yellow findings.
   *
   * Supports two formats:
   * 1. Markdown headings: `### Red: <description>` / `### Yellow: <description>`
   * 2. YAML front-matter blocks with severity: red|yellow
   *
   * @param content - Validation report content
   * @returns Array of extracted patterns
   */
  parseValidationReport(content: string): ExtractedPattern[] {
    const patterns: ExtractedPattern[] = [];

    // Format 1: Markdown heading patterns
    // Matches: "**Red**: description" or "### Red Finding: description"
    const redPatterns = this.extractMarkdownFindings(content, 'red');
    const yellowPatterns = this.extractMarkdownFindings(content, 'yellow');
    patterns.push(...redPatterns, ...yellowPatterns);

    // Format 2: YAML front-matter with findings list
    const yamlPatterns = this.extractYAMLFindings(content);
    patterns.push(...yamlPatterns);

    // Deduplicate by description
    const seen = new Set<string>();
    return patterns.filter((p) => {
      const key = `${p.severity}:${p.description.slice(0, 50)}`;
      if (seen.has(key)) {return false;}
      seen.add(key);
      return true;
    });
  }

  // ============================================================================
  // Private helpers
  // ============================================================================

  /**
   * T048/T049: Extract findings from markdown-formatted reports.
   */
  private extractMarkdownFindings(content: string, severity: 'red' | 'yellow'): ExtractedPattern[] {
    const patterns: ExtractedPattern[] = [];
    const lines = content.split('\n');
    const label = severity === 'red' ? 'red' : 'yellow';
    const labelRe = new RegExp(`\\b${label}\\b`, 'i');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // Match lines like: "**Red**: description" or "- Red: description"
      // or "### Red Finding" or bullet items with severity annotation
      if (labelRe.test(line) && (line.includes(':') || line.startsWith('#'))) {
        const description = this.extractDescription(line, label);
        if (description.length > 10) {
          const affectedFiles = this.extractFilePaths(
            lines.slice(Math.max(0, i - 2), Math.min(lines.length, i + 5)).join('\n')
          );
          const category = this.inferCategory(description, line);
          patterns.push({
            severity,
            category,
            description,
            affectedFiles,
            agentId: this.inferAgentId(content),
            featureId: '',
          });
        }
      }
    }

    return patterns;
  }

  /**
   * Extract YAML-formatted findings from report.
   */
  private extractYAMLFindings(content: string): ExtractedPattern[] {
    const patterns: ExtractedPattern[] = [];

    // Look for YAML blocks with severity: red|yellow
    const yamlBlockRe = /severity:\s*(red|yellow)\s*\ndescription:\s*(.+)/gi;
    let match: RegExpExecArray | null;

    while ((match = yamlBlockRe.exec(content)) !== null) {
      const severity = match[1].toLowerCase() as 'red' | 'yellow';
      const description = match[2].trim();
      if (description.length > 5) {
        patterns.push({
          severity,
          category: this.inferCategory(description, ''),
          description,
          affectedFiles: [],
          agentId: this.inferAgentId(content),
          featureId: '',
        });
      }
    }

    return patterns;
  }

  /** Extract description text from a finding line */
  private extractDescription(line: string, label: string): string {
    // Remove markdown heading markers, bullet points, bold markers
    return line
      .replace(/^#+\s*/, '')
      .replace(/^\s*[-*]\s*/, '')
      .replace(/\*\*/g, '')
      .replace(new RegExp(`\\b${label}\\b:?\\s*`, 'i'), '')
      .trim()
      .replace(/^Finding:?\s*/i, '')
      .trim();
  }

  /** Extract file paths mentioned in context */
  private extractFilePaths(context: string): string[] {
    const fileRe = /[\w./\\-]+\.(ts|tsx|js|jsx|json|md|yaml|yml)/g;
    return [...new Set(context.match(fileRe) ?? [])];
  }

  /** Infer memory category from description and surrounding context */
  private inferCategory(description: string, context: string): string {
    const combined = (description + ' ' + context).toLowerCase();
    if (/security|auth|jwt|csrf|xss|injection/.test(combined)) {return 'security';}
    if (/performance|cache|latency|timeout|slow/.test(combined)) {return 'performance';}
    if (/test|coverage|mock|assertion/.test(combined)) {return 'test_quality';}
    if (/integration|api|contract|interface/.test(combined)) {return 'integration';}
    if (/type|typescript|lint|style|convention/.test(combined)) {return 'standards';}
    return 'correctness';
  }

  /** Infer agent ID from report header */
  private inferAgentId(content: string): string {
    const agentRe = /agent[:\s]+([a-z\-_]+)/i;
    const match = agentRe.exec(content);
    return match ? match[1].toLowerCase() : 'validation-agent';
  }

  /**
   * T048/T049: Save an extracted pattern as a memory.
   *
   * Red → `validation_pattern` category with `#validation_pattern #severity:red` tags
   * Yellow → `lesson` category with `#lesson #severity:yellow` tags
   */
  private async savePattern(pattern: ExtractedPattern, featureId: string): Promise<Memory> {
    const isRed = pattern.severity === 'red';
    const category = isRed ? 'validation_pattern' : 'lesson';
    const severityTag = isRed ? '#severity:red' : '#severity:yellow';
    const baseTag = isRed ? '#validation_pattern' : '#lesson';

    const content = [
      pattern.description,
      pattern.affectedFiles.length > 0 ? `Affected files: ${pattern.affectedFiles.join(', ')}` : '',
    ]
      .filter(Boolean)
      .join('\n');

    return this.memoryManager.save({
      category,
      tags: [baseTag, severityTag, `#${pattern.category}`, '#auto_extracted'],
      scope: 'local',
      content,
      lastUsed: Date.now(),
      usedCount: 0,
      learnedFrom: featureId,
      agentId: pattern.agentId,
    });
  }
}
