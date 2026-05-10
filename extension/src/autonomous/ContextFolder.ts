/**
 * ContextFolder — Section-Level Folding for Context Output
 *
 * Renders context sections in collapsed/summary/expanded modes based
 * on fold state persisted in `.specify/hooks/context-fold-state.json`.
 *
 * 018 T049-T051: Implements rubric item I1 (section-level folding).
 */

import * as fs from 'fs';
import * as path from 'path';

/** Fold mode for each section */
export type FoldMode = 'collapsed' | 'summary' | 'expanded';

/** Fold state for all context sections */
export interface FoldState {
  [sectionKey: string]: FoldMode;
}

/** Section with content and optional summary */
export interface FoldableSection {
  key: string;
  header: string;
  content: string;
  /** Short summary used when collapsed or in summary mode */
  summary?: string;
}

const DEFAULT_FOLD_STATE: FoldState = {};

export class ContextFolder {
  private readonly foldStatePath: string;
  private foldState: FoldState = {};

  constructor(workspaceRoot: string) {
    this.foldStatePath = path.join(workspaceRoot, '.specify', 'hooks', 'context-fold-state.json');
    this.loadFoldState();
  }

  /**
   * T050: Load fold state from disk. Missing file = passthrough (all expanded).
   */
  private loadFoldState(): void {
    try {
      if (fs.existsSync(this.foldStatePath)) {
        const raw = fs.readFileSync(this.foldStatePath, 'utf-8');
        this.foldState = JSON.parse(raw);
      } else {
        this.foldState = { ...DEFAULT_FOLD_STATE };
      }
    } catch {
      this.foldState = { ...DEFAULT_FOLD_STATE };
    }
  }

  /**
   * Reload fold state from disk (for runtime updates).
   */
  reload(): void {
    this.loadFoldState();
  }

  /**
   * Get fold mode for a section. Returns 'expanded' if not configured.
   */
  getFoldMode(sectionKey: string): FoldMode {
    return this.foldState[sectionKey] || 'expanded';
  }

  /**
   * T051: Render a section according to its fold mode.
   *
   * - collapsed: Show only a one-line placeholder
   * - summary: Show the summary or first ~200 chars
   * - expanded: Pass through unchanged
   */
  renderSection(section: FoldableSection): string {
    const mode = this.getFoldMode(section.key);

    switch (mode) {
      case 'collapsed':
        return `${section.header}\n_[Section collapsed — ${this.estimateTokens(section.content)} tokens saved]_`;

      case 'summary': {
        const summaryText = section.summary || this.generateAutoSummary(section.content);
        return `${section.header}\n_[Summary mode]_ ${summaryText}`;
      }

      case 'expanded':
      default:
        return `${section.header}\n${section.content}`;
    }
  }

  /**
   * Apply fold state to a map of context sections.
   * Returns the modified sections map.
   */
  applyToSections(sections: Record<string, string | undefined>): Record<string, string | undefined> {
    const result: Record<string, string | undefined> = {};
    for (const [key, content] of Object.entries(sections)) {
      if (!content) {
        result[key] = content;
        continue;
      }
      const mode = this.getFoldMode(key);
      if (mode === 'expanded') {
        result[key] = content;
      } else if (mode === 'collapsed') {
        result[key] = `_[Section collapsed — ${this.estimateTokens(content)} tokens saved]_`;
      } else {
        // summary mode
        result[key] = this.generateAutoSummary(content);
      }
    }
    return result;
  }

  /**
   * Generate a brief auto-summary of content (first 200 chars + line count).
   */
  private generateAutoSummary(content: string): string {
    const lines = content.split('\n').length;
    const preview = content.slice(0, 200).replace(/\n/g, ' ').trim();
    return `${preview}${content.length > 200 ? '...' : ''} (${lines} lines)`;
  }

  /**
   * Estimate token count for content (chars / 4).
   */
  private estimateTokens(content: string): number {
    return Math.ceil(content.length / 4);
  }
}
