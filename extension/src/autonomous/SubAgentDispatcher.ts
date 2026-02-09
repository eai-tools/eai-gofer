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
}> = [
  {
    minUtilization: 0.5,
    agentType: 'codebase-locator',
    taskCategory: 'file search',
    reason: 'Consider delegating file search to a codebase-locator sub-agent via the Task tool to keep main context lean.',
  },
  {
    minUtilization: 0.6,
    agentType: 'codebase-analyzer',
    taskCategory: 'code analysis',
    reason: 'Context usage is high. Delegate deep code analysis to a codebase-analyzer sub-agent to reduce main context load.',
  },
  {
    minUtilization: 0.7,
    agentType: 'codebase-pattern-finder',
    taskCategory: 'pattern exploration',
    reason: 'Context approaching critical. Use codebase-pattern-finder sub-agent for exploratory searches instead of main context.',
  },
];

export class SubAgentDispatcher {
  private readonly policy: DelegationPolicy;
  private readonly workspaceRoot: string;
  private currentRecommendation: DelegationRecommendation | null = null;
  private lastUtilization = 0;

  constructor(workspaceRoot: string, policy?: Partial<DelegationPolicy>) {
    this.workspaceRoot = workspaceRoot;
    this.policy = { ...DEFAULT_POLICY, ...policy };
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
    };

    // Log to JSONL (fire-and-forget)
    this.logRecommendation(this.currentRecommendation).catch(() => {});
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
    return [
      `## Delegation Advisory`,
      '',
      `**Context utilization**: ${rec.utilizationPercent.toFixed(0)}%`,
      `**Recommended action**: Use \`${rec.agentType}\` sub-agent for ${rec.taskCategory}`,
      '',
      rec.reason,
      '',
      `> Use the Task tool with subagent_type="${rec.agentType}" to delegate work and keep the main context window lean.`,
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
