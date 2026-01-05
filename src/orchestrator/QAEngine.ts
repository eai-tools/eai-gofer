/**
 * QA Engine - Answers questions based on specifications with optional LLM Council
 *
 * Features:
 * - Answer questions based on loaded specifications
 * - Pattern matching for pre-defined QA rules
 * - LLM-based inference for complex questions
 * - Confidence scoring for answers
 * - Optional LLM council for multi-perspective answers
 *
 * @see .specify/specs/003-orchestrator-agents/data-model.md
 * @see .specify/specs/009-llm-council-integration/spec.md
 */

import Anthropic from '@anthropic-ai/sdk';
import type { Specification, QARule, Task, AcceptanceCriterion } from '../types/index.js';

/**
 * Answer result with confidence scoring
 */
export interface QAAnswer {
  answer: string | null;
  confidence: 'high' | 'medium' | 'low' | 'none';
  needsHuman: boolean;
  source?: 'qa-rule' | 'claude-analysis' | 'council';
  reasoning?: string;
}

/**
 * QA Engine options
 */
export interface QAEngineOptions {
  /** Use LLM council for multi-perspective answers */
  useCouncil?: boolean;
  /** Maximum response tokens */
  maxTokens?: number;
  /** Model to use */
  model?: string;
}

/**
 * QA Engine for answering questions based on specifications
 */
export class QAEngine {
  private anthropic: Anthropic;
  private specs: Specification[];
  private model: string;

  constructor(apiKey: string, specs: Specification[], model?: string) {
    this.anthropic = new Anthropic({ apiKey });
    this.specs = specs;
    this.model = model || 'claude-opus-4-5-20251101';
  }

  /**
   * Answer a question based on specifications
   */
  async answerQuestion(question: string, options: QAEngineOptions = {}): Promise<QAAnswer> {
    // First, check if any QA rules match
    const ruleMatch = this.findMatchingRule(question);
    if (ruleMatch) {
      const confidence =
        ruleMatch.confidence >= 80 ? 'high' : ruleMatch.confidence >= 60 ? 'medium' : 'low';
      return {
        answer: ruleMatch.answer,
        confidence,
        needsHuman: confidence === 'low',
        source: 'qa-rule',
      };
    }

    // If no rule matches, use Claude to search specs
    try {
      const specContext = this.buildSpecContext();

      const response = await this.anthropic.messages.create({
        model: this.model,
        max_tokens: options.maxTokens || 1024,
        messages: [
          {
            role: 'user',
            content: `You are answering questions based ONLY on the following specifications.

If the answer is clearly in the specs, provide it with HIGH confidence.
If the answer can be inferred from the specs, provide it with MEDIUM confidence.
If the answer is not in the specs or requires assumptions, respond with LOW confidence and say "NEEDS_HUMAN".

Specifications:
${specContext}

Question: ${question}

Format your response as:
CONFIDENCE: [HIGH|MEDIUM|LOW]
ANSWER: [your answer or "NEEDS_HUMAN"]
REASONING: [brief explanation of how you arrived at the answer]`,
          },
        ],
      });

      const text = response.content[0].type === 'text' ? response.content[0].text : '';
      return this.parseResponse(text);
    } catch (error) {
      // Return error result
      return {
        answer: null,
        confidence: 'none',
        needsHuman: true,
        source: 'claude-analysis',
        reasoning: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Batch answer multiple questions
   */
  async answerBatch(questions: string[], options: QAEngineOptions = {}): Promise<QAAnswer[]> {
    const results: QAAnswer[] = [];
    for (const question of questions) {
      const answer = await this.answerQuestion(question, options);
      results.push(answer);
    }
    return results;
  }

  /**
   * Check if a question can be answered from specs
   */
  async canAnswer(question: string): Promise<{ canAnswer: boolean; source: string }> {
    // Check for rule match
    const ruleMatch = this.findMatchingRule(question);
    if (ruleMatch) {
      return { canAnswer: true, source: 'qa-rule' };
    }

    // Use LLM to check if the question can be answered
    try {
      const specContext = this.buildSpecContext();

      const response = await this.anthropic.messages.create({
        model: this.model,
        max_tokens: 100,
        messages: [
          {
            role: 'user',
            content: `Based on these specifications, can you answer the following question?

Specifications:
${specContext}

Question: ${question}

Respond with exactly one word: YES or NO`,
          },
        ],
      });

      const text = response.content[0].type === 'text' ? response.content[0].text.trim() : '';
      const canAnswer = text.toUpperCase().includes('YES');

      return { canAnswer, source: canAnswer ? 'specs' : 'none' };
    } catch {
      return { canAnswer: false, source: 'error' };
    }
  }

  /**
   * Find a matching QA rule
   */
  findMatchingRule(question: string): QARule | null {
    const normalizedQuestion = question.toLowerCase().trim();

    for (const spec of this.specs) {
      for (const rule of spec.qaRules || []) {
        const pattern = rule.pattern.toLowerCase();

        // Simple pattern matching (could be enhanced with regex or fuzzy matching)
        if (normalizedQuestion.includes(pattern) || pattern.includes(normalizedQuestion)) {
          return {
            pattern: rule.pattern,
            answer: rule.answer,
            confidence: rule.confidence,
          };
        }

        // Check for keyword overlap
        const questionWords = new Set(normalizedQuestion.split(/\s+/));
        const patternWords = pattern.split(/\s+/);
        const matchCount = patternWords.filter((w) => questionWords.has(w)).length;

        if (matchCount >= patternWords.length * 0.7) {
          // 70% word match
          return {
            pattern: rule.pattern,
            answer: rule.answer,
            confidence: Math.min(rule.confidence, 70), // Lower confidence for fuzzy match
          };
        }
      }
    }

    return null;
  }

  /**
   * Build context from all loaded specifications
   */
  private buildSpecContext(): string {
    if (this.specs.length === 0) {
      return '';
    }

    return this.specs
      .map(
        (spec) => `
## ${spec.title} (${spec.id})

Status: ${spec.status}
Priority: ${spec.priority}

### Tasks:
${spec.tasks.map((t: Task) => `- [${t.status}] ${t.description}`).join('\n') || 'None'}

### Acceptance Criteria:
${spec.acceptanceCriteria.map((ac: AcceptanceCriterion) => `- [${ac.status}] ${ac.description}`).join('\n') || 'None'}

### QA Rules:
${spec.qaRules?.map((qa: QARule) => `Q: ${qa.pattern}\nA: ${qa.answer}`).join('\n') || 'None'}
`
      )
      .join('\n---\n');
  }

  /**
   * Parse LLM response into QAAnswer
   */
  private parseResponse(text: string): QAAnswer {
    const confidenceMatch = text.match(/CONFIDENCE:\s*(HIGH|MEDIUM|LOW)/i);
    const answerMatch = text.match(/ANSWER:\s*(.+?)(?=\nREASONING:|$)/s);
    const reasoningMatch = text.match(/REASONING:\s*(.+)/s);

    const rawConfidence = confidenceMatch?.[1]?.toUpperCase();
    const confidence =
      rawConfidence === 'HIGH'
        ? 'high'
        : rawConfidence === 'MEDIUM'
          ? 'medium'
          : rawConfidence === 'LOW'
            ? 'low'
            : 'none';

    const rawAnswer = answerMatch?.[1]?.trim() || null;
    const needsHuman =
      rawAnswer === 'NEEDS_HUMAN' ||
      rawAnswer?.includes('NEEDS_HUMAN') ||
      confidence === 'low' ||
      confidence === 'none';

    return {
      answer: needsHuman ? null : rawAnswer,
      confidence: needsHuman ? 'none' : confidence,
      needsHuman,
      source: 'claude-analysis',
      reasoning: reasoningMatch?.[1]?.trim(),
    };
  }

  /**
   * Update specifications
   */
  updateSpecs(specs: Specification[]): void {
    this.specs = specs;
  }

  /**
   * Add a single specification
   */
  addSpec(spec: Specification): void {
    this.specs.push(spec);
  }

  /**
   * Remove a specification by ID
   */
  removeSpec(specId: string): void {
    this.specs = this.specs.filter((s) => s.id !== specId);
  }

  /**
   * Get current specifications count
   */
  getSpecCount(): number {
    return this.specs.length;
  }

  /**
   * Search specs for a keyword
   */
  searchSpecs(keyword: string): Specification[] {
    const normalized = keyword.toLowerCase();
    return this.specs.filter(
      (spec) =>
        spec.title.toLowerCase().includes(normalized) ||
        spec.tasks.some((t) => t.description.toLowerCase().includes(normalized)) ||
        spec.acceptanceCriteria.some((ac) => ac.description.toLowerCase().includes(normalized))
    );
  }
}
