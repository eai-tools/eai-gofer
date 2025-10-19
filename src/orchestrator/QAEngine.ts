import Anthropic from '@anthropic-ai/sdk';
import { Spec, QARule } from '../types.js';

export class QAEngine {
  private anthropic: Anthropic;
  private specs: Spec[];

  constructor(apiKey: string, specs: Spec[]) {
    this.anthropic = new Anthropic({ apiKey });
    this.specs = specs;
  }

  async answerQuestion(question: string): Promise<{
    answer: string | null;
    confidence: 'high' | 'medium' | 'low' | 'none';
    needsHuman: boolean;
    source?: string;
  }> {
    // First, check if any QA rules match
    const ruleMatch = this.findMatchingRule(question);
    if (ruleMatch) {
      return {
        answer: ruleMatch.answer,
        confidence: ruleMatch.confidence,
        needsHuman: ruleMatch.confidence === 'low',
        source: 'qa-rule'
      };
    }

    // If no rule matches, use Claude to search specs
    const specContext = this.buildSpecContext();

    const response = await this.anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 1024,
      messages: [{
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
ANSWER: [your answer or "NEEDS_HUMAN"]`
      }]
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    const confidenceMatch = text.match(/CONFIDENCE:\s*(HIGH|MEDIUM|LOW)/i);
    const answerMatch = text.match(/ANSWER:\s*(.+)/s);

    const confidence = (confidenceMatch?.[1]?.toLowerCase() as 'high' | 'medium' | 'low') || 'low';
    const answer = answerMatch?.[1]?.trim() || null;
    const needsHuman = answer === 'NEEDS_HUMAN' || confidence === 'low';

    return {
      answer: needsHuman ? null : answer,
      confidence: needsHuman ? 'none' : confidence,
      needsHuman,
      source: 'claude-analysis'
    };
  }

  private findMatchingRule(question: string): QARule | null {
    const normalizedQuestion = question.toLowerCase().trim();

    for (const spec of this.specs) {
      for (const rule of spec.qaRules || []) {
        const pattern = rule.question.toLowerCase();

        // Simple pattern matching (could be enhanced with regex)
        if (normalizedQuestion.includes(pattern) || pattern.includes(normalizedQuestion)) {
          return rule;
        }
      }
    }

    return null;
  }

  private buildSpecContext(): string {
    return this.specs.map(spec => `
## ${spec.title} (${spec.id})
${spec.description}

Tasks:
${spec.tasks.map(t => `- ${t.description}`).join('\n')}

Acceptance Criteria:
${spec.acceptanceCriteria.map(ac => `- ${ac.description}`).join('\n')}

QA Rules:
${spec.qaRules?.map(qa => `Q: ${qa.question}\nA: ${qa.answer}`).join('\n') || 'None'}
`).join('\n---\n');
  }

  updateSpecs(specs: Spec[]): void {
    this.specs = specs;
  }
}
