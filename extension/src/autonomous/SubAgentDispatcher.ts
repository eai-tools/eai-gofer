/**
 * SubAgentDispatcher - Progressive Delegation via Context Injection
 *
 * Listens to ContextHealthMonitor events and generates delegation
 * recommendations when context utilization exceeds thresholds.
 * Recommendations are injected into ContextBuilder output as advisory
 * sections that Claude Code reads via MCP.
 *
 * T047: Phase 6 - Stage Management, Delegation & Quality
 */

import * as fs from 'fs';
import * as path from 'path';
import { Logger } from '../services/Logger';

/**
 * Delegation recommendation for sub-agent usage.
 */
export interface DelegationRecommendation {
  /** Recommended agent type (codebase-locator, codebase-analyzer, codebase-pattern-finder) */
  agentType: string;
  /** Category of task to delegate */
  taskCategory: string;
  /** Human-readable reason for delegation */
  reason: string;
  /** Current context utilization percentage */
  utilizationPercent: number;
  /** Timestamp when recommendation was generated */
  timestamp: number;
  /** 018 T046: Token budget for sub-agent result truncation */
  tokenBudget: number;
  /** 018 T045: Enforcement level — advisory (suggest), warning (alert), blocking (require) */
  enforcement: 'advisory' | 'warning' | 'blocking';
}

/**
 * Configuration for delegation policy.
 */
export interface DelegationPolicy {
  /** Utilization threshold above which to recommend sub-agents (default: 0.5) */
  subAgentThreshold: number;
  /** Whether delegation is enabled (default: true) */
  enabled: boolean;
}

const DEFAULT_POLICY: DelegationPolicy = {
  subAgentThreshold: 0.5,
  enabled: true,
};

/**
 * Agent type recommendations based on utilization and task patterns.
 */
const DELEGATION_MAP: Array<{
  minUtilization: number;
  agentType: string;
  taskCategory: string;
  reason: string;
  tokenBudget: number;
  enforcement: 'advisory' | 'warning' | 'blocking';
}> = [
  {
    minUtilization: 0.5,
    agentType: 'codebase-locator',
    taskCategory: 'file search',
    reason:
      'Consider delegating file search to a codebase-locator sub-agent via the Task tool to keep main context lean.',
    tokenBudget: 2000,
    enforcement: 'advisory',
  },
  {
    minUtilization: 0.6,
    agentType: 'codebase-analyzer',
    taskCategory: 'code analysis',
    reason:
      'Context usage is high. Delegate deep code analysis to a codebase-analyzer sub-agent to reduce main context load.',
    tokenBudget: 1500,
    enforcement: 'warning',
  },
  {
    minUtilization: 0.7,
    agentType: 'codebase-pattern-finder',
    taskCategory: 'pattern exploration',
    reason:
      'Context approaching critical. Use codebase-pattern-finder sub-agent for exploratory searches instead of main context.',
    tokenBudget: 1000,
    enforcement: 'blocking',
  },
];

export class SubAgentDispatcher {
  private readonly policy: DelegationPolicy;
  private readonly workspaceRoot: string;
  private currentRecommendation: DelegationRecommendation | null = null;
  private lastUtilization = 0;
  private logger?: Logger;

  constructor(workspaceRoot: string, policy?: Partial<DelegationPolicy>, logger?: Logger) {
    this.workspaceRoot = workspaceRoot;
    this.policy = { ...DEFAULT_POLICY, ...policy };
    this.logger = logger;
  }

  /**
   * Update utilization from ContextHealthMonitor events.
   */
  updateUtilization(utilizationPercent: number): void {
    this.lastUtilization = utilizationPercent;

    if (!this.policy.enabled) {
      this.currentRecommendation = null;
      return;
    }

    const utilFraction = utilizationPercent / 100;

    if (utilFraction < this.policy.subAgentThreshold) {
      this.currentRecommendation = null;
      return;
    }

    // Find the highest-threshold matching delegation
    let bestMatch = DELEGATION_MAP[0];
    for (const entry of DELEGATION_MAP) {
      if (utilFraction >= entry.minUtilization) {
        bestMatch = entry;
      }
    }

    this.currentRecommendation = {
      agentType: bestMatch.agentType,
      taskCategory: bestMatch.taskCategory,
      reason: `Context at ${utilizationPercent.toFixed(0)}%. ${bestMatch.reason}`,
      utilizationPercent,
      timestamp: Date.now(),
      tokenBudget: bestMatch.tokenBudget,
      enforcement: bestMatch.enforcement,
    };

    // Log to JSONL (fire-and-forget)
    this.logRecommendation(this.currentRecommendation).catch((err) =>
      this.logger?.error('SubAgentDispatcher:LogRecommendation', err as Error, {
        operation: 'log-recommendation',
        agentType: this.currentRecommendation?.agentType,
      })
    );
  }

  /**
   * Get current delegation recommendation, or null if below threshold.
   */
  getRecommendation(): DelegationRecommendation | null {
    return this.currentRecommendation;
  }

  /**
   * Format recommendation as a context section for injection into buildContext().
   */
  formatAsContextSection(): string | undefined {
    if (!this.currentRecommendation) {
      return undefined;
    }

    const rec = this.currentRecommendation;
    // Maps enforcement to heading: advisory → "## Delegation Advisory", warning → "## Delegation Warning", blocking → "## Delegation REQUIRED"
    const enforcementLabel =
      rec.enforcement === 'blocking'
        ? 'REQUIRED'
        : rec.enforcement === 'warning'
          ? 'Warning'
          : 'Advisory';
    return [
      `## Delegation ${enforcementLabel}`,
      '',
      `**Context utilization**: ${rec.utilizationPercent.toFixed(0)}%`,
      `**Enforcement**: ${rec.enforcement}`,
      `**Recommended action**: Use \`${rec.agentType}\` sub-agent for ${rec.taskCategory}`,
      `**Token budget**: ${rec.tokenBudget} tokens per sub-agent result`,
      '',
      rec.reason,
      '',
      `> Use the Task tool with subagent_type="${rec.agentType}" to delegate work and keep the main context window lean.`,
    ].join('\n');
  }

  /**
   * 018 T047: Truncate sub-agent result to fit within the current token budget.
   * Preserves the first and last portions of the result for maximum usefulness.
   */
  truncateResult(result: string, maxTokens?: number): string {
    const budget = maxTokens ?? this.currentRecommendation?.tokenBudget ?? 2000;
    const maxChars = budget * 4; // ~4 chars per token
    if (result.length <= maxChars) return result;

    const headSize = Math.floor(maxChars * 0.7);
    const tailSize = Math.floor(maxChars * 0.2);
    const head = result.slice(0, headSize);
    const tail = result.slice(-tailSize);
    const truncatedChars = result.length - headSize - tailSize;
    return `${head}\n\n[...truncated ${truncatedChars} chars (${Math.ceil(truncatedChars / 4)} tokens)...]\n\n${tail}`;
  }

  /**
   * 019 F5: Programmatic delegation check. Returns structured recommendation
   * that can be used for automated enforcement decisions.
   */
  shouldDelegate(): { delegate: boolean; reason: string; agentType: string } {
    if (!this.currentRecommendation) {
      return { delegate: false, reason: 'Utilization below delegation threshold', agentType: '' };
    }
    return {
      delegate: true,
      reason: this.currentRecommendation.reason,
      agentType: this.currentRecommendation.agentType,
    };
  }

  /**
   * 019 G3: Format dispatch instructions if delegation is recommended.
   * Returns structured dispatch instructions with result collection markers,
   * or undefined if no delegation needed.
   */
  dispatchIfRecommended(): string | undefined {
    const check = this.shouldDelegate();
    if (!check.delegate || !this.currentRecommendation) {
      return undefined;
    }

    const rec = this.currentRecommendation;
    return [
      `## DELEGATION DISPATCH`,
      '',
      `**Agent**: \`${rec.agentType}\``,
      `**Task Category**: ${rec.taskCategory}`,
      `**Token Budget**: ${rec.tokenBudget} tokens`,
      `**Enforcement**: ${rec.enforcement}`,
      '',
      `### Dispatch Instructions`,
      '',
      `Use the Task tool with \`subagent_type="${rec.agentType}"\` to delegate the following:`,
      `- Category: ${rec.taskCategory}`,
      `- Max result size: ${rec.tokenBudget} tokens`,
      '',
      `### Result Collection`,
      '',
      `<!-- DISPATCH_RESULT_START agent="${rec.agentType}" -->`,
      `[Sub-agent result will be inserted here]`,
      `<!-- DISPATCH_RESULT_END -->`,
      '',
      `> ${rec.reason}`,
    ].join('\n');
  }

  private async logRecommendation(rec: DelegationRecommendation): Promise<void> {
    const logDir = path.join(this.workspaceRoot, '.specify', 'logs');
    const logPath = path.join(logDir, 'context-usage.jsonl');

    const entry = {
      timestamp: new Date().toISOString(),
      eventType: 'delegation_recommendation',
      agentType: rec.agentType,
      taskCategory: rec.taskCategory,
      utilizationPercent: rec.utilizationPercent,
    };

    try {
      fs.mkdirSync(logDir, { recursive: true });
      fs.appendFileSync(logPath, JSON.stringify(entry) + '\n');
    } catch {
      // Best-effort logging
    }
  }
}
