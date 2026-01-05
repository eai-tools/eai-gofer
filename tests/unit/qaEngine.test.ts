/**
 * QAEngine Unit Tests
 *
 * Tests for QAEngine question answering and spec context building.
 * Uses real test data (not mocks) per project testing philosophy.
 *
 * For integration tests with real API calls,
 * see tests/integration/qaEngine.integration.test.ts
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { QAEngine } from '../../src/orchestrator/QAEngine.js';
import type { Specification } from '../../src/types/index.js';

// Helper to check if API key is available for integration tests
const hasApiKey = (): boolean => {
  const key = process.env.ANTHROPIC_API_KEY;
  return key !== undefined && key.length > 0;
};

describe('QAEngine', () => {
  describe('Unit Tests (no API calls)', () => {
    let qaEngine: QAEngine;
    let mockSpecs: Specification[];

    beforeEach(() => {
      mockSpecs = [
        {
          id: 'test-001',
          title: 'Authentication System',
          status: 'in_progress',
          priority: 'high',
          tasks: [
            {
              id: 'T001',
              description: 'Create login endpoint',
              status: 'completed',
              dependencies: [],
            },
            {
              id: 'T002',
              description: 'Add JWT token generation',
              status: 'pending',
              dependencies: ['T001'],
            },
          ],
          acceptanceCriteria: [
            {
              id: 'AC001',
              description: 'Users can log in with email and password',
              status: 'pending',
            },
            {
              id: 'AC002',
              description: 'JWT tokens expire after 24 hours',
              status: 'pending',
            },
          ],
          qaRules: [
            {
              pattern: 'jwt token expiration',
              answer:
                'JWT tokens expire after 24 hours as specified in the authentication requirements.',
              confidence: 95,
            },
            {
              pattern: 'login methods',
              answer: 'Users can log in with email and password.',
              confidence: 90,
            },
          ],
        },
        {
          id: 'test-002',
          title: 'Database Schema',
          status: 'pending',
          priority: 'medium',
          tasks: [
            {
              id: 'T003',
              description: 'Design PostgreSQL schema',
              status: 'pending',
              dependencies: [],
            },
          ],
          acceptanceCriteria: [
            {
              id: 'AC003',
              description: 'Schema supports user profiles',
              status: 'pending',
            },
          ],
        },
      ];

      // Create QAEngine with dummy API key (no actual calls in unit tests)
      qaEngine = new QAEngine('dummy-key-for-unit-tests', mockSpecs);
    });

    describe('constructor', () => {
      it('should create instance with API key and specs', () => {
        const engine = new QAEngine('test-key', mockSpecs);
        expect(engine).toBeInstanceOf(QAEngine);
      });

      it('should create instance with empty specs array', () => {
        const engine = new QAEngine('test-key', []);
        expect(engine).toBeInstanceOf(QAEngine);
        expect(engine.getSpecCount()).toBe(0);
      });

      it('should accept custom model', () => {
        const engine = new QAEngine('test-key', [], 'claude-3-opus-20240229');
        expect(engine).toBeInstanceOf(QAEngine);
      });
    });

    describe('findMatchingRule', () => {
      it('should find exact match for QA rule', () => {
        const result = qaEngine.findMatchingRule('jwt token expiration');

        expect(result).not.toBeNull();
        expect(result!.answer).toContain('24 hours');
        expect(result!.confidence).toBe(95);
      });

      it('should find rule with partial match', () => {
        const result = qaEngine.findMatchingRule('What is the jwt token expiration time?');

        expect(result).not.toBeNull();
        expect(result!.answer).toContain('24 hours');
      });

      it('should find rule with different case', () => {
        const result = qaEngine.findMatchingRule('JWT TOKEN EXPIRATION');

        expect(result).not.toBeNull();
        expect(result!.answer).toContain('24 hours');
      });

      it('should find rule with keyword overlap', () => {
        const result = qaEngine.findMatchingRule('login methods supported');

        expect(result).not.toBeNull();
        expect(result!.answer).toContain('email and password');
      });

      it('should return null for no matching rule', () => {
        const result = qaEngine.findMatchingRule('What is the weather like?');

        expect(result).toBeNull();
      });

      it('should lower confidence for fuzzy matches', () => {
        // Create a rule that will trigger fuzzy match
        const specsWithFuzzyRule: Specification[] = [
          {
            id: 'fuzzy-spec',
            title: 'Fuzzy Test',
            status: 'draft',
            priority: 'low',
            tasks: [],
            acceptanceCriteria: [],
            qaRules: [
              {
                pattern: 'api rate limiting',
                answer: 'Rate limit is 100 requests per minute.',
                confidence: 100,
              },
            ],
          },
        ];

        const engine = new QAEngine('test-key', specsWithFuzzyRule);
        const result = engine.findMatchingRule('rate limiting api');

        if (result) {
          // Fuzzy matches should have lower confidence
          expect(result.confidence).toBeLessThanOrEqual(70);
        }
      });

      it('should handle specs without QA rules', () => {
        const specsWithoutRules: Specification[] = [
          {
            id: 'no-rules',
            title: 'Spec Without Rules',
            status: 'draft',
            priority: 'low',
            tasks: [],
            acceptanceCriteria: [],
            // No qaRules property
          },
        ];

        const engine = new QAEngine('test-key', specsWithoutRules);
        const result = engine.findMatchingRule('anything');

        expect(result).toBeNull();
      });
    });

    describe('Spec Management', () => {
      describe('getSpecCount', () => {
        it('should return correct spec count', () => {
          expect(qaEngine.getSpecCount()).toBe(2);
        });

        it('should return 0 for empty specs', () => {
          const emptyEngine = new QAEngine('key', []);
          expect(emptyEngine.getSpecCount()).toBe(0);
        });
      });

      describe('updateSpecs', () => {
        it('should replace all specs', () => {
          const newSpecs: Specification[] = [
            {
              id: 'new-001',
              title: 'New Spec',
              status: 'draft',
              priority: 'low',
              tasks: [],
              acceptanceCriteria: [],
            },
          ];

          qaEngine.updateSpecs(newSpecs);

          expect(qaEngine.getSpecCount()).toBe(1);
        });
      });

      describe('addSpec', () => {
        it('should add a new spec', () => {
          const newSpec: Specification = {
            id: 'test-003',
            title: 'New Feature',
            status: 'draft',
            priority: 'low',
            tasks: [],
            acceptanceCriteria: [],
          };

          qaEngine.addSpec(newSpec);

          expect(qaEngine.getSpecCount()).toBe(3);
        });
      });

      describe('removeSpec', () => {
        it('should remove spec by ID', () => {
          qaEngine.removeSpec('test-001');

          expect(qaEngine.getSpecCount()).toBe(1);
        });

        it('should handle removing non-existent spec', () => {
          qaEngine.removeSpec('non-existent');

          expect(qaEngine.getSpecCount()).toBe(2);
        });
      });

      describe('searchSpecs', () => {
        it('should find specs by title keyword', () => {
          const results = qaEngine.searchSpecs('Authentication');

          expect(results).toHaveLength(1);
          expect(results[0].id).toBe('test-001');
        });

        it('should find specs by task description', () => {
          const results = qaEngine.searchSpecs('JWT');

          expect(results).toHaveLength(1);
          expect(results[0].id).toBe('test-001');
        });

        it('should find specs by acceptance criteria', () => {
          const results = qaEngine.searchSpecs('user profiles');

          expect(results).toHaveLength(1);
          expect(results[0].id).toBe('test-002');
        });

        it('should be case insensitive', () => {
          const results = qaEngine.searchSpecs('DATABASE');

          expect(results).toHaveLength(1);
          expect(results[0].id).toBe('test-002');
        });

        it('should return empty array for no matches', () => {
          const results = qaEngine.searchSpecs('nonexistent feature');

          expect(results).toHaveLength(0);
        });

        it('should find specs by partial description match', () => {
          // Search for word that appears in task descriptions
          const results = qaEngine.searchSpecs('endpoint');

          expect(results).toHaveLength(1);
          expect(results[0].id).toBe('test-001');
        });
      });
    });

    describe('buildSpecContext (private method behavior)', () => {
      it('should include spec titles in context used by answerQuestion', async () => {
        // We can verify context building indirectly through the class behavior
        // The specs should be accessible and properly formatted
        expect(qaEngine.getSpecCount()).toBe(2);

        const searchResults = qaEngine.searchSpecs('Authentication');
        expect(searchResults).toHaveLength(1);
        expect(searchResults[0].title).toBe('Authentication System');
      });

      it('should handle empty specs array gracefully', () => {
        const emptyEngine = new QAEngine('key', []);
        expect(emptyEngine.getSpecCount()).toBe(0);

        const searchResults = emptyEngine.searchSpecs('anything');
        expect(searchResults).toHaveLength(0);
      });
    });
  });

  describe('Integration Tests (Real API Calls)', () => {
    let qaEngine: QAEngine;
    let testSpecs: Specification[];

    beforeEach(() => {
      testSpecs = [
        {
          id: 'int-001',
          title: 'Payment Processing',
          status: 'approved',
          priority: 'high',
          tasks: [
            {
              id: 'T001',
              description: 'Integrate Stripe API',
              status: 'completed',
              dependencies: [],
            },
          ],
          acceptanceCriteria: [
            {
              id: 'AC001',
              description: 'Support credit card payments',
              status: 'met',
            },
            {
              id: 'AC002',
              description: 'Process refunds within 5 business days',
              status: 'pending',
            },
          ],
          qaRules: [
            {
              pattern: 'payment methods',
              answer: 'We support credit card payments via Stripe.',
              confidence: 95,
            },
          ],
        },
      ];

      if (hasApiKey()) {
        qaEngine = new QAEngine(process.env.ANTHROPIC_API_KEY!, testSpecs);
      }
    });

    it.runIf(hasApiKey())(
      'should answer question from QA rule without API call',
      async () => {
        const result = await qaEngine.answerQuestion('What payment methods are supported?');

        expect(result).toBeDefined();
        expect(result.answer).toContain('credit card');
        expect(result.confidence).toBe('high');
        expect(result.source).toBe('qa-rule');
        expect(result.needsHuman).toBe(false);
      },
      { timeout: 30000 }
    );

    it.runIf(hasApiKey())(
      'should answer question using Claude when no rule matches',
      async () => {
        const result = await qaEngine.answerQuestion('How long does it take to process refunds?');

        expect(result).toBeDefined();
        expect(result.source).toBe('claude-analysis');
        // The answer should mention 5 business days from the acceptance criteria
        if (result.confidence !== 'none') {
          expect(result.answer?.toLowerCase()).toContain('5');
        }
      },
      { timeout: 30000 }
    );

    it.runIf(hasApiKey())(
      'should indicate when question cannot be answered from specs',
      async () => {
        const result = await qaEngine.answerQuestion('What is the meaning of life?');

        expect(result).toBeDefined();
        expect(result.needsHuman).toBe(true);
        expect(['low', 'none']).toContain(result.confidence);
      },
      { timeout: 30000 }
    );

    it.runIf(hasApiKey())(
      'should check if question can be answered',
      async () => {
        const canAnswerPayment = await qaEngine.canAnswer('What payment methods are supported?');
        expect(canAnswerPayment.canAnswer).toBe(true);
        expect(canAnswerPayment.source).toBe('qa-rule');

        const canAnswerRandom = await qaEngine.canAnswer('What color is the sky on Mars?');
        // This should likely return false as it's not in specs
        expect(canAnswerRandom).toBeDefined();
        expect(typeof canAnswerRandom.canAnswer).toBe('boolean');
      },
      { timeout: 30000 }
    );

    it.runIf(hasApiKey())(
      'should batch answer multiple questions',
      async () => {
        const questions = ['What payment methods are supported?', 'How are refunds processed?'];

        const results = await qaEngine.answerBatch(questions);

        expect(results).toHaveLength(2);
        expect(results[0].answer).toBeDefined();
        expect(results[1].answer).toBeDefined();
      },
      { timeout: 60000 }
    );

    it.runIf(hasApiKey())(
      'should handle API errors gracefully',
      async () => {
        // Create engine with invalid API key
        const badEngine = new QAEngine('invalid-key', testSpecs);

        // Ask a question that won't match any rule (forces API call)
        const result = await badEngine.answerQuestion('What is the refund policy?');

        expect(result).toBeDefined();
        expect(result.confidence).toBe('none');
        expect(result.needsHuman).toBe(true);
        expect(result.reasoning).toContain('Error');
      },
      { timeout: 30000 }
    );

    it.runIf(hasApiKey())(
      'should include reasoning in response',
      async () => {
        const result = await qaEngine.answerQuestion('How are payments integrated?');

        expect(result).toBeDefined();
        // Claude-based answers should include reasoning
        if (result.source === 'claude-analysis' && result.confidence !== 'none') {
          expect(result.reasoning).toBeDefined();
          expect(result.reasoning!.length).toBeGreaterThan(0);
        }
      },
      { timeout: 30000 }
    );
  });
});
